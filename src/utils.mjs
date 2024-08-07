import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import { createCipheriv, createDecipheriv } from 'node:crypto';
import { sha256 } from '@quanxiaoxiao/node-utils';

export const encode = (chunk, options) => {
  if (!options || !options.key) {
    return chunk;
  }
  const {
    key,
    iv,
    algorithm,
  } = options;
  const cipher = createCipheriv(algorithm, key, iv);
  return Buffer.concat([
    cipher.update(chunk),
    cipher.final(),
  ]);
};

export const decode = (chunk, options) => {
  if (!options || !options.key) {
    return chunk;
  }
  const {
    key,
    iv,
    algorithm,
  } = options;
  const decipher = createDecipheriv(algorithm, key, iv);
  return Buffer.concat([
    decipher.update(chunk),
    decipher.final(),
  ]);
};

export const readResourcesBufWithDecode = (filePathnameList, options) => filePathnameList
  .map((pathname) => decode(fs.readFileSync(pathname), options));

export const calcSize = (list) => list
  .reduce((acc, cur) => acc + Buffer.byteLength(cur), 0);

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
