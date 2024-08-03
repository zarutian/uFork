\ uCode/Forth syntax&semantics
\ https://raw.githubusercontent.com/zarutian/uFork/main/fpga/ucode/src/uFork_quadmem.js
\ assumes gc is not hw implemented
\ reference https://github.com/organix/ufork-c/blob/main/gc.md

gcMem CONSTANT 0x1000 ( should be changed )

: gcMem_common ( D: quad_ram_addr -- bit_offset addr )
  0x3FFF_&
  DUP
  7_&
  2*
  2+
  SWAP
  8/
  gcMem_base
  +
  ;
  
: gcMem@       ( D: quad_addr -- gc_mark )
  gcMem_common ( D: bit_offset addr )
  @            ( D: bit_offset cell )
  SWAP         ( D: cell bit_offset )
  LBR
  3_&          ( D: gc_mark )
  ;
  
: gcMem!       ( D: gc_mark quad_addr -- )
  gcMem_common ( D: gc_mark bit_offset addr )
  DUP
  @            ( D: gc_mark bit_offset addr cell )
  SWAP
  >R           ( D: gc_mark bit_offset cell  R: addr )
  OVER         ( D: gc_mark bit_offset cell bit_offset  R: addr )
  3 INVERT     ( D: gc_mark bit_offset cell bit_offset 0xFFFC  R: addr )
  SWAP LBR     ( D: gc_mark bit_offset cell mask  R: addr )
  & >R         ( D: gc_mark bit_offset  R: addr masked_cell )
  LBR R>       ( D: gc_mark_offsetted masked_cell  R: addr )
  OR  R>       ( D: cell addr )
  !            ( D: )
  ;
  
  gc_genx_mark CONSTANT 0 ( should be aliased to zero constant )
  gc_geny_mark CONSTANT 1 ( ditto )
  gc_scan_mark CONSTANT 2 ( ditto )
  gc_free_mark CONSTANT 3 ( ditto )
  
  VARIABLE gc_currGen  ( 0 gc_currGen ! )
  VARIABLE gc_ptr      ( 0 gc_ptr ! )
  VARIABLE gc_phase    ( 0 gc_phase ! )

: gc_incr_ptr ( D: -- offset ) gc_ptr @ DUP 1+ gc_ptr ! ;

: gc_not_gen  ( D: gen_mark -- gen_mark )
  JMPTBL 2 ,
  gc_geny_mark
  gc_genx_mark
  ;
  
: gc_swapCurrGen  gc_currGen @ gc_not_gen gc_currGen ! ;

: gc_add2scanque ( D: quaddr -- )
  quaddrInRam BRZ (DROP)
  DUP
  gcMem@
  gc_currGen
  @
  <>
  BRZ (DROP)
  gc_scan_mark
  SWAP
  gcMem!
  ;

: gc_offset2quadRamAddr ( D: offset -- quaddr ) memoryDescriptor_qaddr + ;

: gc_scan_quad           ( D: offset -- )
  gc_offset2quadRamAddr  ( D: qram_addr )
  DUP QT@ gc_add2scanque
  DUP QX@ gc_add2scanque
  DUP QY@ gc_add2scanque
      QZ@ gc_add2scanque ( D: )
  ;

: gc_phase_common ( D: phase -- ) gc_phase ! ;

: gc_mark_setup   ( D: phase -- )
  gc_swapCurrGen  ( D: phase )
  0 gc_ptr !      
  0xF ?LOOP-
    R@ gc_offset2quadRamAddr gc_add2scanque
  AGAIN           ( D: phase )
  1+ gc_phase_common
  ;

: gc_mark ( D: phase -- )
  gc_incr_ptr
  DUP meta_quadMemSize_in_quads > IF
    DROP 1+ gc_phase_common ;
  THEN ( D: phase offset )
  DUP gcMem@ gc_scan_mark = IF
    DUP gc_currGen @ SWAP gcMem!
    gc_scan_quad ( D: phase )
  ELSE
    DROP
  THEN
  DUP 4& BRNZ gc_mark ( stop-the-world condition )
  DROP
  ;

: gc_sweep_setup ( D: phase -- ) 0 gc_ptr ! 1+ gc_phase_common ;

: gc_sweep ( D: phase -- )
  gc_incr_ptr
  DUP meta_quadMemSize_in_quads > IF
    DROP 1+ gc_phase_common ;
  THEN ( D: phase offset )
  DUP gcMem@ ( D: phase offset mark )
  DUP gc_currGen @ = ( D: phase offset mark bool )
  IF
    : gc_sweep_l2
    2DROP gc_phase_common ;
  THEN
  DUP gc_currGen @ gc_not_gen = BRZ gc_sweep_l2 ( D: phase offset mark )
  DROP DUP gc_offset2quadRamAddr uFork_free     ( D: phase offset )
  gc_free_mark SWAP gcMem!
  gc_phase_common
  ;

: gcOneStep ( D: --  COMMENT: entry point, expected to be called from main run loop )
  gc_phase @ DUP
  JMPTBL 4 ,
  gc_mark_setup  ( COMMENT: 0 )
  gc_mark        ( COMMENT: 1 )
  gc_sweep_setup ( COMMENT: 2 )
  gc_sweep       ( COMMENT: 3 )
  DROP
  3&
  gc_phase_common
  ;
