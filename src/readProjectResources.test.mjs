import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import assert from 'node:assert';
import { readFileList } from '@quanxiaoxiao/node-utils';
import readProjectResources from './readProjectResources.mjs';

test('readProjectResources', () => {
  let ret = readProjectResources({
    name: 'quan',
    dir: process.cwd(),
    currentDirName: 'src',
  });

  assert(ret.size > 0);

  assert.equal(
    ret.size,
    readFileList(path.resolve(process.cwd(), 'src'))
      .reduce((acc, pathname) => acc + fs.readFileSync(pathname).length, 0),
  );
  ret = readProjectResources({
    name: 'quan',
    dir: process.cwd(),
    currentDirName: 'srcsss',
  });
  assert.deepEqual(
    ret,
    {
      hash: null,
      pageInfo: null,
      size: 0,
      list: [],
    },
  );
});
