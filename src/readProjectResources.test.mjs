import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

import readProjectResources from './readProjectResources.mjs';
import { calcHash } from './utils.mjs';

const getResources = (pathname) => {
  const stats = fs.statSync(pathname);
  if (!stats.isDirectory()) {
    return [pathname];

  }
  const list = fs.readdirSync(pathname);
  const result = [];
  for (let i = 0; i < list.length; i++) {
    const name = list[i];
    result.push(...getResources(path.join(pathname, name)));
  }
  return result;
};

test('readProjectResources', async () => {
  let ret = await readProjectResources({
    name: 'quan',
    dir: process.cwd(),
    currentDirName: 'src',
  });

  assert(ret.size > 0);

  const resourceList = getResources(path.resolve(process.cwd(), 'src'));
  const size = resourceList.reduce((acc, cur) => acc + fs.readFileSync(cur).length, 0);

  assert.equal(size, ret.size);

  assert.equal(
    ret.hash,
    calcHash(resourceList.map((pathname) => fs.readFileSync(pathname))),
  );

  ret = await readProjectResources({
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
