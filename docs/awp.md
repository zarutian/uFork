# Actor Wire Protocol

The Actor Wire Protocol (AWP) facilitates the secure delivery of messages
between actors over a network. Such a network could consist of machines
distributed across the globe, or CPU cores sharing the same chip. Messages can
contain actor addresses, allowing actors to perform introductions.

The protocol assumes an underlying _transport_ providing secure delivery of
small binary blobs. At the transport level, connections are established
between _parties_. Every party has a secure _name_ that it can prove it owns,
and may have a network _address_ to help other parties find it.

When an actor wishes to communicate with actors outside of its own address
space, it does so via a party. When a party receives a message, it attempts to
forward it to a local actor. Messages tagged with a _swiss number_ are
forwarded to the designated actor, all other messages are forwarded to the
party's _greeter_ actor, if one is registered.

## Transports

The transport is responsible for verifying the name of connecting parties and
encrypting traffic. Note that network addresses are used solely for routing,
and should not be relied upon for security.

AWP does not require that the transport deliver messages reliably or in order.
Because of this, AWP can be used as a very efficient low-level protocol where
guarantees like reliability and ordering are achieved through message passing.
If, however, the transport does guarantee reliability or ordering, applications
are free to rely on those properties.

Existing network protocols that make suitable transports include QUIC and DTLS.
Ordered protocols such as TLS will also work, but may incur a performance
penalty due to head-of-line blocking inherent to TCP.

## Frames

Each binary blob sent or received by a transport is a _frame_. A frame is an
[OED-encoded object](https://github.com/organix/mycelia/blob/master/OED.md).

Message frames have the following properties:

- `message`: a Raw BLOB containing the OED-encoded message. See "Marshalling"
  below.
- `target`: a Raw BLOB containing the destination actor's Swiss number. If
  omitted, the message is delivered to the greeter.

## Marshalling

Outgoing messages must be encoded as OED prior to transmission, then decoded at
the other end. This process is referred to as _marshalling_ and _unmarshalling_.

Implementations are free to marshall messages however they see fit, with one
exception. Any actor address found in the message must be encoded as an OED
Extension BLOB structured like so:

Field   | Contents
--------|----------------------
meta    | `{name}` or `{name, address}`
data    | 128-bit Swiss number

The _meta_ field is an object containing the actor's party's name and optionally
its address. The format of the name and address are transport-dependent.

The _data_ field is the actor's unguessable Swiss number, as a sequence of 16
octets. Swiss numbers should be generated by a secure random number generator,
and retained for the lifetime of the actor.