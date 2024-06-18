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
  asm.addr = 0xBABE;
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

  const t2 = (item) => {
    if (asm.symbols.isDefined(item)) {
      const t1 = asm.symbols.lookup(item);
      if (typeof(t1) == "string") {
        item = t1;
      }
    }
    return item;
  };
  asm.datum = (item) => {
    text.push("".concat(t2(item)));
  };
  asm.data = (...datums) => {
    const t1 = new Array(datums);
    text.push("".concat(t1.map(t2).join(" ")));
  }

  asm.done = () => {
    return Promise.resolve({ text: text.join("\n"), symbols: syms });
  };

  asm.macro = {};
  asm.symbols.define("(JMP)", 0xDEAD);
  asm.macro.jmp = (dest) => {
    asm.data("JMP", dest);
  };
  asm.symbols.define("(BRZ)", 0xDEAD);
  asm.macro.brz = (dest) => {
    asm.data("BRZ", dest);
  };
  asm.symbols.define("(NEXT)", 0xDEAD);
  asm.macro.loopMinus = (dest) => {
    asm.data("NEXT", dest);
  }
  asm.macro.countDownLoop = (prefix, body) => {
    text.push("DO");
    body();
    text.push("LOOP-");
  };
  asm.macro.beginAgainLoop = (prefix, body) => {
    text.push("BEGIN");
    body();
    text.push("AGAIN");
  };
  asm.macro.beginUntilLoop = (prefix, body) => {
    text.push("BEGIN");
    body();
    text.push("UNTIL");
  };
  //                  forskeyti, yrðing, afleiðing,  annars
  asm.macro.efSegð = (prefix, condition, consequent, alternative) => {
    condition();
    text.push("IF");
    consequent();
    if (alternative != undefined) {
      text.push("ELSE");
      alternative();
    }
    text.push("THEN");
  };
  if (asm.symbols.isDefined("instrset_uFork_SM2.2")) {
    asm.symbols.define("NOP",     0xDEAD);
    asm.symbols.define("(LIT)",   0xDEAD);
    asm.symbols.define("(CONST)", 0xDEAD);
    asm.symbols.define("EXIT",    0xDEAD);
    asm.symbols.define("PLUS",    0xDEAD);
    asm.symbols.define("AND",     0xDEAD);
    asm.symbols.define("XOR",     0xDEAD);
    asm.symbols.define("1LBR",    0xDEAD);
    asm.symbols.define("INCR",    0xDEAD);
    asm.symbols.define("FETCH",   0xDEAD);
    asm.symbols.define("STORE",   0xDEAD);
    asm.symbols.define("DUP",     0xDEAD);
    asm.symbols.define("DROP",    0xDEAD);
    asm.symbols.define("SWAP",    0xDEAD);
    // SKZ not implemented in hardware
    asm.symbols.define("TO_R",    0xDEAD);
    asm.symbols.define("R_FROM",  0xDEAD);
    asm.symbols.define("R_AT",    0xDEAD);
    asm.symbols.define("MINUS",   0xDEAD);
    asm.symbols.define("OR",      0xDEAD);
    asm.symbols.define("DECR",    0xDEAD);
    asm.symbols.define("INVERT",  0xDEAD);
    asm.symbols.define("NEGATE",  0xDEAD);
    asm.symbols.define("OVER",    0xDEAD);
    asm.symbols.define("ROT",     0xDEAD);
    asm.symbols.define("-ROT",    0xDEAD);
    asm.symbols.define("(FALSE)", 0xDEAD);
    asm.symbols.define("(TRUE)",  0xDEAD);
    asm.symbols.define("1",       0xDEAD); // LSB
    asm.symbols.define("0x8000",  0xDEAD); // MSB
    asm.symbols.define("2*",      0xDEAD);
  }
  
  asm.def = asm.symbols.define;
  asm.dat = asm.data;
  asm.isDefined = asm.symbols.isDefined;
  return asm;
};

export default {
  makeSrc2srcTranslator,
};
