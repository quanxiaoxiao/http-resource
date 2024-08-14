import { sha256 } from '@quanxiaoxiao/node-utils';

export const calcHash = (bufList) => bufList
  .map((buf) => sha256(buf))
  .sort((a, b) => {
    if (a === b) {
      return 0;
    }
    if (a > b) {
      return 1;
    }
    return -1;
  })
  .reduce((acc, cur) => sha256(`${acc}${cur}`), '');
