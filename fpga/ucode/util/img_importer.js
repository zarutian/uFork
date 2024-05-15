// @ts-check js
/**
 * @use JSDoc
 * @overview This file provides functions to import ucode memory images from
 *           various formats.
 * @author Zarutian
 */

// @param {string} memh text string
// @returns {[Map<Uint16, Uint16>, undefined]}
export const memh2img = (inp) => {
  // this version only gives the image and not symbols
  const t1 = inp.split("\n"); // split into lines
  const t2 = t1.map((line) => line.split("//")[0]); // get rid of comments
  const t3 = t3.filter((line) => (line != "")); // get rid of empty lines
  let addr = 0x0000;
  const img = new Map();
  t3.forEach((line) => { img.set(addr, Number.parseInt(line, 16)); addr += 1; });
  return [img, undefined];
};
export default {
  memh2img,
};
