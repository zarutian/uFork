// @ts-check js
/**
 * @use JSDoc
 * @overview Various small utility functions
 * @author Zarutian
 **/

export const makeArrayFromIterator = (iterator) => {
  const arr = [];
  let done = false;
  let value = undefined;
  while (!done) {
    ({ value, done }) = iterator.next();
    done = (done == undefined) ? false : done ;
    if (value != undefined) {
      arr.push(value);
    }
  }
  return arr;
};

 resolve = undefined;
  let reject  = undefined;
  let prom    = new Promise((res, rej) => {
    [resolve, reject] = [res, rej];
  });
  return { promise: prom, resolve, reject };
};

export const makeBitmask = (width) => {
  let result = 0;
  for (let count = 0; count < width; count++) {
    result = (result << 1) | 1;
  }
  return result;
}
