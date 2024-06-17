// @ts-check js
/**
 * @use JSDoc
 * @overview This translates from masm structured/formatted code into forth ish source code
 * @author Zarutian
 **/

// @desc used in the same way as makeAssembler() in masm.js
export const makeSrc2srcTranslator = (opts) => {
  opts = (opts == undefined) ? {} : opts;
  const syms = (opts.symbols == undefined) ? new Map() : opts.symbols ;
  const asm = {};
  asm.symbols = {};
  asm.symbols.define = (sym, val = undefined) => {
  };
  asm.symbols.lookup =    (sym) => { return syms.get(sym); };
  asm.symbols.isDefined = (sym) => { return syms.has(sym); };
  asm.symbols.redefine  = (sym, val = undefined) => {
    syms.delete(sym);
    asm.symbols.define(sym, val);
  };
  return asm;
};

export default {
  makeSrc2srcTranslator,
};
