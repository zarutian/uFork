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
  return asm;
};

export default {
  makeSrc2srcTranslator,
};
