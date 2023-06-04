// A uFork device that talks AWP (Actor Wire Protocol).

/*jslint browser, null */

import OED from "./oed.js";
import dummy_transport from "./dummy_transport.js";

//debug import make_ufork from "./ufork.js";

function make_awp_device(core, resume) {
    const sponsor = core.u_ramptr(core.SPONSOR_OFS);
    const device = core.u_ptr_to_cap(core.u_ramptr(core.AWP_DEV_OFS));

    let transport = dummy_transport();
    let listeners = Object.create(null);
    let connections = Object.create(null);
    let stubs = Object.create(null); // TODO release at some point
    let frame_id = -1;

    function next_frame_id() {
        frame_id += 1;
        return frame_id;
    }

    function make_proxy(identity, swiss_raw = core.UNDEF_RAW) {
        return core.u_ptr_to_cap(core.h_reserve_ram({
            t: core.PROXY_T,
            x: device,
            y: core.h_reserve_ram({t: core.PAIR_T, x: identity, y: swiss_raw})
        }));
    }

//  uFork           | OED
//  ----------------|---------------
//  #?              | null
//  #t              | true
//  #f              | false
//  #nil            | []
//  (a . b)         | [a, b]
//  fixnum          | integer

    function marshall(value) {
        return OED.encode(value, function pack(raw, key) {
            if (key === true) {
                return {value: raw}; // meta
            }
            if (raw === core.UNDEF_RAW) {
                return {value: null};
            }
            if (raw === core.TRUE_RAW) {
                return {value: true};
            }
            if (raw === core.FALSE_RAW) {
                return {value: false};
            }
            if (raw === core.NIL_RAW) {
                return {value: []};
            }
            if (core.u_is_fix(raw)) {
                return {value: core.u_fix_to_i32(raw)};
            }
            if (core.u_is_ptr(raw)) {
                const quad = core.u_read_quad(raw);
                if (quad.t === core.PAIR_T) {
                    return {value: [quad.x, quad.y]};
                }
            }
            if (core.u_is_cap(raw)) {
                const swiss = core.u_rawofs(raw); // discard the type-tag bits
                if (stubs[swiss] === undefined) {
                    stubs[swiss] = core.h_reserve_stub(device, raw);
                }
                return {meta: swiss};
            }
            throw new Error("Failed to marshall " + core.u_pprint(value));
        });
    }

    function unmarshall(buffer, default_identity) {
        return OED.decode(buffer, function unpack(object, canonical, key) {
            if (key === true) {
                return canonical(); // meta
            }
            if (object.value === null) {
                return core.UNDEF_RAW;
            }
            if (object.value === true) {
                return core.TRUE_RAW;
            }
            if (object.value === false) {
                return core.FALSE_RAW;
            }
            if (Array.isArray(object.value)) {
                if (object.value.length === 2) {
                    return core.h_reserve_ram({
                        t: core.PAIR_T,
                        x: object.value[0],
                        y: object.value[1]
                    });
                }
                if (object.value.length === 0) {
                    return core.NIL_RAW;
                }
            }
            if (
                object.natural !== undefined
                || Number.isSafeInteger(object.value)
            ) {
                return core.u_fixnum(canonical());
            }
            if (Number.isSafeInteger(object.meta)) {
                // TODO check for non-default identities
                return make_proxy(default_identity, core.u_fixnum(object.meta));
            }
            throw new Error("Failed to unmarshall " + JSON.stringify(object));
        });
    }

    function intro(event_stub_ptr, request) {
        const on_introduced_customer = core.u_nth(request, 2);
        const connect_info = core.u_nth(request, 3);
        const hello_data = core.u_nth(request, -3);

        function resolve(reply) {

// (stop . reason) -> on_introduced_customer

            core.h_event_inject(sponsor, on_introduced_customer, reply);
            core.h_release_stub(event_stub_ptr);
            event_stub_ptr = undefined;
        }

// Validate the message.

        if (
            !core.u_is_cap(on_introduced_customer)
            || !core.u_is_ptr(connect_info)
        ) {
            return core.E_FAIL;
        }
        const connect_info_quad = core.u_read_quad(connect_info);
        if (
            connect_info_quad.t !== core.PAIR_T
            || !core.u_is_fix(connect_info_quad.x)
            || !core.u_is_fix(connect_info_quad.y)
        ) {
            return core.E_FAIL;
        }

// Connect. This happens on a future turn because we make use of the
// non-reentrant core methods, and it is possible that the transport will call
// one of its callbacks immediately.

        setTimeout(function () {

// TODO connection pooling

            const to = core.u_fix_to_i32(connect_info_quad.x);
            const from = core.u_fix_to_i32(connect_info_quad.y);
            const close = transport.connect(
                {to, from},
                function on_open(connection) {
                    console.log("connect on_open", connection.info());
                    connections[connection.info()] = connection;

// Send the introduction request.

                    connection.send(OED.encode({
                        id: next_frame_id(),
                        message: marshall(hello_data)
                    }));
                },
                function on_receive(connection, frame_buffer) {
                    const frame = OED.decode(frame_buffer);
                    console.log("connect on_receive", to, frame);
                    if (frame.to === undefined) {
                        if (event_stub_ptr !== undefined) {

// This is the greeting we have been waiting for.

                            resolve(unmarshall(frame.message, to));
                            return resume();
                        }
                    } else {

// The frame is a message addressed to a particular actor.

                        const stub = stubs[frame.to];
                        if (stub !== undefined) {
                            core.h_event_inject(
                                sponsor,
                                core.u_read_quad(stub).y,
                                unmarshall(frame.message, connection.info())
                            );
                            return resume();
                        }
                    }
                },
                function on_close(connection, reason) {
                    if (connection !== undefined) {
                        console.log("connect on_close", connection.info(), reason);
                        delete connections[connection.info()];
                    }
                    if (event_stub_ptr !== undefined) {

// The introduction has failed.

                        console.log("connect fail", reason);
                        resolve(core.h_reserve_ram({
                            t: core.PAIR_T,
                            x: core.UNDEF_RAW,
                            y: core.u_fixnum(-1) // TODO error codes
                        }));
                        return resume();
                    }
                }
            );
        });
        return core.E_OK;
    }

    function listen(event_stub_ptr, request) {
        const on_listening_customer = core.u_nth(request, 2);
        const listen_info = core.u_nth(request, 3);
        const greeter = core.u_nth(request, -3);

        function resolve(stop, reason) {

// (stop . reason) -> on_listening_customer

            core.h_event_inject(
                sponsor,
                on_listening_customer,
                core.h_reserve_ram({
                    t: core.PAIR_T,
                    x: stop,
                    y: reason
                })
            );
            core.h_release_stub(event_stub_ptr);
            event_stub_ptr = undefined;
        }

        if (
            !core.u_is_cap(on_listening_customer)
            || !core.u_is_fix(listen_info)
            || !core.u_is_cap(on_listening_customer)
        ) {
            return core.E_FAIL;
        }

// The message looks valid. Listen.

        setTimeout(function () {
            const bind_address = core.u_fix_to_i32(listen_info);
            const greeter_stub = core.h_reserve_stub(device, greeter);
            const stop = transport.listen(
                bind_address,
                function on_open(connection) {
                    console.log("listen on_open", connection.info());
                    // TODO what about multiple connections to same party?
                    connections[connection.info()] = connection;
                },
                function on_receive(connection, frame_buffer) {
                    const frame = OED.decode(frame_buffer);
                    console.log("listen on_receive", connection.info(), frame);
                    if (frame.to === undefined) {

// The frame is an introduction request. Forward it to the greeter.

                        const greeting_customer = make_proxy(connection.info());

// (cancel_customer greeting_customer connection_info . hello) -> greeter

                        core.h_event_inject(
                            sponsor,
                            greeter,
                            core.h_reserve_ram({
                                t: core.PAIR_T,
                                x: core.UNDEF_RAW, // TODO cancel_customer
                                y: core.h_reserve_ram({
                                    t: core.PAIR_T,
                                    x: greeting_customer,
                                    y: core.h_reserve_ram({
                                        t: core.PAIR_T,
                                        x: core.u_fixnum(connection.info()),
                                        y: unmarshall(
                                            frame.message,
                                            connection.info()
                                        )
                                    })
                                })
                            })
                        );
                        return resume();
                    }

// The frame is a message addressed to a particular actor.

                    const stub = stubs[frame.to];
                    if (stub !== undefined) {
                        core.h_event_inject(
                            sponsor,
                            core.u_read_quad(stub).y,
                            unmarshall(frame.message, connection.info())
                        );
                        return resume();
                    }
                },
                function on_close(connection, reason) {
                    if (connection !== undefined) {
                        console.log("listen on_close", connection.info(), reason);
                        delete connections[connection.info()];
                    }
                    if (event_stub_ptr !== undefined) {
                        core.h_release_stub(greeter_stub);
                        console.log("listen fail", reason);
                        resolve(core.UNDEF_RAW, core.u_fixnum(-1)); // TODO error codes
                        return resume();
                    }
                }
            );
            listeners[bind_address] = {greeter_stub, stop};
            if (event_stub_ptr !== undefined) {
                resolve(core.UNDEF_RAW, core.UNDEF_RAW); // TODO provide stop cap
            }
            return resume();
        });
        return core.E_OK;
    }

    function forward(event_stub_ptr, identity, swiss, message) {
        setTimeout(function () {
            const connection = connections[core.u_fix_to_i32(identity)];
            if (connection !== undefined) { // TODO open connection if necessary
                connection.send(OED.encode({
                    id: next_frame_id(),
                    to: (
                        swiss === core.UNDEF_RAW
                        ? undefined
                        : core.u_fix_to_i32(swiss)
                    ),
                    message: marshall(message)
                }));
            }
            core.h_release_stub(event_stub_ptr);
        });
        return core.E_OK;
    }

    const handler_array = [intro, listen];

    function handle_event(raw) {
        if (core.u_is_cap(raw)) {

// A proxy has been garbage collected.
// TODO inform the relevant party.

            return core.E_OK;
        }

// We are handling an event.

        const event_stub_ptr = raw;

// The event stub retains the event, including its message, in memory until
// explicitly released. This is necessary because h_reserve_stub is
// non-reentrant, so marshalling must take place on a future turn and we don't
// want the message to be GC'd in the meantime.

        const event_stub = core.u_read_quad(event_stub_ptr);
        const event = core.u_read_quad(event_stub.y);
        const message = event.y;

// Inspect the event target. If it is a proxy, forward the message to a remote
// actor.

        const target_quad = core.u_read_quad(core.u_cap_to_ptr(event.x));
        if (target_quad.t === core.PROXY_T) {
            const handle = core.u_read_quad(target_quad.y);
            return forward(event_stub_ptr, handle.x, handle.y, message);
        }

// Choose a handler function based on the message tag (#intro, #listen, etc).

        const tag = core.u_nth(message, 1);
        if (!core.u_is_fix(tag)) {
            return core.E_FAIL;
        }
        const handler = handler_array[core.u_fix_to_i32(tag)];
        if (handler === undefined) {
            return core.E_BOUNDS;
        }

// Forward the remainder of the message to the chosen handler. The handler may
// need to reserve stubs for the portions of the message it will need later.
// When the handler is done doing that, it should release the event stub.

        return handler(event_stub_ptr, core.u_nth(message, -1));
    }

    return Object.freeze({handle_event});
}

//debug let awp_device;
//debug let core;
//debug function resume() {
//debug     console.log(core.u_fault_msg(core.h_run_loop()));
//debug }
//debug WebAssembly.instantiateStreaming(
//debug     fetch(import.meta.resolve(
//debug         "../target/wasm32-unknown-unknown/debug/ufork_wasm.wasm"
//debug     )),
//debug     {
//debug         capabilities: {
//debug             host_clock() {
//debug                 console.log("host_clock");
//debug                 return performance.now();
//debug             },
//debug             host_print() {
//debug                 console.log("host_print");
//debug             },
//debug             host_log(x) {
//debug                 console.log("host_log", core.u_pprint(x));
//debug             },
//debug             host_timer() {
//debug                 console.log("host_timer");
//debug             },
//debug             host_awp(...args) {
//debug                 return awp_device.handle_event(...args);
//debug             }
//debug         }
//debug     }
//debug ).then(function (wasm) {
//debug     core = make_ufork(wasm.instance, console.log);
//debug     awp_device = make_awp_device(core, resume);
//debug     return core.h_import(import.meta.resolve("../lib/awp_demo.asm"));
//debug }).then(function (transport_module) {
//debug     core.h_boot(transport_module.boot);
//debug     resume();
//debug });

export default Object.freeze(make_awp_device);