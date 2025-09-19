import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

import calcHash from './calcHash.mjs';
import listResources from './listResources.mjs';
import readProjectResources from './readProjectResources.mjs';

test('readProjectResources', () => {
  let ret = readProjectResources({
    name: 'quan',
    dir: process.cwd(),
    currentDirName: 'src',
  });

  assert(ret.size > 0);

  const resourceList = listResources(path.resolve(process.cwd(), 'src'));
  const size = resourceList.reduce((acc, cur) => acc + fs.readFileSync(cur).length, 0);

  assert.equal(size, ret.size);

  assert.equal(
    ret.hash,
    calcHash(resourceList.map((pathname) => fs.readFileSync(pathname))),
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
      pageAst: null,
      size: 0,
      list: [],
    },
  );
});
