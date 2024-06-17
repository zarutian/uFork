// @ts-check js
/**
 * @use JSDoc
 * @overview This translates from masm structured/formatted code into forth ish source code
 * @author Zarutian
 **/

// @desc used in the same way as makeAssembler() in masm.js
export const makeSrc2srcTranslator = (opts) => {
  opts = (opts == undefined) ? {} : opts;
  const text = [];
  const syms = (opts.symbols == undefined) ? new Map() : opts.symbols ;
  const asm = {};
  asm.symbols = {};
  asm.symbols.define = (sym, val = undefined) => {
    if (syms.has(sym)) {
      throw new Error(`the symbol ${sym} is already defined as ${syms.get(sym)}`);
    }
    if (val == undefined) {
      val = 0xDEAD;
      text.push(": ".concat(sym));
    } else {
      text.push("0x".concat(Number(val).toString(16).padStart(4, "0"), " CONSTANT ", sym));
    }
    syms.set(sym, val);
    return val;
  };
  asm.symbols.lookup =    (sym) => { return syms.get(sym); };
  asm.symbols.isDefined = (sym) => { return syms.has(sym); };
  asm.symbols.redefine  = (sym, val = undefined) => {
    throw new Error("Redefining is not yet implemented");
    syms.delete(sym);
    asm.symbols.define(sym, val);
  };

  asm.allot = (amount = 1) => {
    throw new Error("allot is not yet implemented");
  };
  asm.origin = (new_addr) => {
    text.push("0x".concat(Number(new_addr).toString(16).padStart(4, "0"), " ORIGIN"));
    return 0xBEEF;
  };

  asm.datum = (item) => {
    text.push(" ".concat(item));
  };
  asm.data = (...datums) => Array.prototype.forEach.call(datums, datum);

  
  return asm;
};

export default {
  makeSrc2srcTranslator,
};
