import { sha256 } from '@quanxiaoxiao/node-utils';

export default (bufList) => {
  if (!bufList.length) return '';

  return bufList
    .map(sha256)
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
};
