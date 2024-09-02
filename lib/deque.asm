;
; subroutines implementing an unbounded version of `deque`
;

;.import
;    std: "./std.asm"
;    std: "https://ufork.org/lib/std.asm"

return_value:               ; k rv
    roll 2                  ; rv k
    return                  ; rv
return_undef:               ; k
    push #?                 ; k rv=#?
    ref return_value
return_nil:                 ; k
    push #nil               ; k rv=()
    ref return_value
return_f:                   ; k
    push #f                 ; k rv=#f
    ref return_value
return_t:                   ; k
    push #t                 ; k rv=#t
    ref return_value
return_unit:                ; k
    push #unit              ; k rv=#unit
    ref return_value
return_zero:                ; k
    push 0                  ; k rv=0
    ref return_value
return_one:                 ; k
    push 1                  ; k rv=1
    ref return_value

new:                        ; ( -- deque )
    deque new               ; k deque
    ref return_value

empty:                      ; ( deque -- bool )
push:                       ; ( deque value -- deque' )
pop:                        ; ( deque -- deque' value )
put:                        ; ( deque value -- deque' )
pull:                       ; ( deque -- deque' value )
len:                        ; ( deque -- n )

; self-checked demo
demo:
    push #?                 ; #?
    deque empty             ; #t
    assert #t               ; --
    deque new               ; (())
    dup 1                   ; (()) (())
    deque empty             ; (()) #t
    assert #t               ; (())
demo_1:
    push 1                  ; (()) 1
    deque push              ; ((1))
    push 2                  ; ((1)) 2
    deque push              ; ((2 1))
    push 3                  ; ((2 1)) 3
    deque push              ; ((3 2 1))
    pick 1                  ; ((3 2 1)) ((3 2 1))
    deque empty             ; ((3 2 1)) #f
    assert #f               ; ((3 2 1))
demo_2:
    dup 1                   ; ((3 2 1)) ((3 2 1))
    deque len               ; ((3 2 1)) 3
    assert 3                ; ((3 2 1))
demo_3:
    deque pull              ; (() 2 3) 1
    assert 1                ; (() 2 3)
    deque pull              ; (() 3) 2
    assert 2                ; (() 3)
    deque pull              ; (()) 3
    assert 3                ; (())
    deque pull              ; (()) #?
    assert #?               ; (())
demo_4:
    dup 1                   ; (()) (())
    deque len               ; (()) 0
    assert 0                ; (())
demo_5:
    dup 1                   ; (()) (())
    msg 0                   ; (()) (()) {caps}
    deque put               ; (()) (() {caps})
    push #unit              ; (()) (() {caps}) #unit
    deque put               ; (()) (() #unit {caps})
    push #nil               ; (()) (() #unit {caps}) ()
    deque put               ; (()) (() () #unit {caps})
    deque pop               ; (()) ((#unit ())) {caps}
    roll -2                 ; (()) {caps} ((#unit ()))
    deque pop               ; (()) {caps} ((())) #unit
    assert #unit            ; (()) {caps} ((()))
    deque pop               ; (()) {caps} (()) ()
    assert #nil             ; (()) {caps} (())
    deque empty             ; (()) {caps} #t
    assert #t               ; (()) {caps}
    msg 0                   ; (()) {caps} {caps}
    cmp eq                  ; (()) #t
    assert #t               ; (())
demo_6:
    dup 1                   ; (()) (())
    push 1                  ; (()) (()) 1
    deque put               ; (()) (() 1)
    push 2                  ; (()) (() 1) 2
    deque put               ; (()) (() 2 1)
    dup 1                   ; (()) (() 2 1) (() 2 1)
    deque empty             ; (()) (() 2 1) #f
    assert #f               ; (()) (() 2 1)
demo_7:
    deque pop               ; (()) (() 2) 1
    assert 1                ; (()) ((2))
    push 3                  ; (()) ((2)) 3
    deque put               ; (()) ((2) 3)
    dup 1                   ; (()) ((2) 3) ((2) 3)
    deque len               ; (()) ((2) 3) 2
    assert 2                ; (()) ((2) 3)
demo_8:
    deque pop               ; (()) (() 3) 2
    assert 2                ; (()) (() 3)
    deque pop               ; (()) (()) 3
    assert 3                ; (()) (())
    deque pop               ; (()) (()) #?
    assert #?               ; (()) (())
    deque len               ; (()) 0
    assert 0                ; (())
    deque empty             ; #t
    assert #t               ; --
    end commit

; unit test suite
boot:                       ; () <- {caps}
;    msg 0                   ; {caps}
;    ref std.commit
;    end commit
    ref demo

.export
    empty
    push
    pop
    put
    pull
    len
    boot
