import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';

import { sha256 } from '@quanxiaoxiao/node-utils';
import shelljs from 'shelljs';

import storeProjectResources from './storeProjectResources.mjs';
import { calcHash } from './utils.mjs';

const calcHash2 = (hashList) => {
  return [...hashList].sort((a, b) => {
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

test('storeProjectResources', async () => {
  const projectItem = {
    dir: path.resolve(process.cwd(), '_dist'),
    name: 'quan',
    metaFileName: '.meta',
    currentDirName: '_',
    tempDirName: '__',
  };
  const sourceDir = path.resolve(process.cwd(), 'src');
  if (shelljs.test('-d', projectItem.dir)) {
    shelljs.rm('-rf', projectItem.dir);
  }
  assert(!shelljs.test('-d', projectItem.dir));
  let ret = await storeProjectResources(projectItem);
  assert.equal(ret, null);
  assert(shelljs.test('-d', projectItem.dir));
  assert(shelljs.test('-f', path.resolve(projectItem.dir, projectItem.metaFileName)));
  assert(!shelljs.test('-d', path.resolve(projectItem.dir, projectItem.currentDirName)));
  assert(!shelljs.test('-d', path.resolve(projectItem.dir, projectItem.tempDirName)));

  shelljs.cp('-R', sourceDir, path.resolve(projectItem.dir, projectItem.tempDirName));
  assert(shelljs.test('-d', path.resolve(projectItem.dir, projectItem.tempDirName)));
  ret = await storeProjectResources(projectItem);
  assert(!shelljs.test('-d', path.resolve(projectItem.dir, projectItem.tempDirName)));
  assert(shelljs.test('-d', path.resolve(projectItem.dir, projectItem.currentDirName)));
  assert.equal(ret.hash, calcHash(getResources(sourceDir).map((pathname) => fs.readFileSync(pathname))));
  assert.equal(
    calcHash(getResources(path.join(projectItem.dir, projectItem.currentDirName)).map((pathname) => fs.readFileSync(pathname))),
    calcHash(getResources(sourceDir).map((pathname) => fs.readFileSync(pathname))),
  );

  const sourceFilepathList = getResources(sourceDir);
  const hashList = [];
  for (let i = 0; i < sourceFilepathList.length; i++) {
    const sourceFilepathname = sourceFilepathList[i];
    const targetFilePathname = path.join(
      projectItem.dir,
      projectItem.currentDirName,
      sourceFilepathname.slice(sourceDir.length + 1),
    );
    assert(sourceFilepathname !== targetFilePathname);
    const sourceBuf = fs.readFileSync(sourceFilepathname);
    const targetBuf = fs.readFileSync(targetFilePathname);
    assert(sourceBuf.equals(targetBuf));
    hashList.push(sha256(sourceBuf));
  }
  assert(hashList.length > 0);
  const hash = calcHash2(hashList);
  const resourceStoreDir = path.join(projectItem.dir, hash);
  assert(shelljs.test('-d', resourceStoreDir));
  const resourcePathnameList = getResources(resourceStoreDir);
  const hashList2 = [];
  for (let i = 0; i < sourceFilepathList.length; i++) {
    hashList2.push(sha256(fs.readFileSync(resourcePathnameList[i])));
  }
  assert.equal(calcHash2(hashList2), hash);
  let metaData = JSON.parse(fs.readFileSync(path.join(projectItem.dir, projectItem.metaFileName)));
  assert.equal(metaData.length, 1);
  assert.equal(metaData[0].hash, hash);

  assert(!shelljs.test('-d', path.resolve(projectItem.dir, projectItem.tempDirName)));
  shelljs.cp('-R', sourceDir, path.resolve(projectItem.dir, projectItem.tempDirName));
  await storeProjectResources(projectItem);
  metaData = JSON.parse(fs.readFileSync(path.join(projectItem.dir, projectItem.metaFileName)));
  assert.equal(metaData.length, 1);
  assert.equal(metaData[0].hash, hash);
  assert(!shelljs.test('-d', path.resolve(projectItem.dir, projectItem.tempDirName)));
  shelljs.cp('-R', path.join(process.cwd(), 'node_modules'), path.resolve(projectItem.dir, projectItem.tempDirName));
  await storeProjectResources(projectItem);
  metaData = JSON.parse(fs.readFileSync(path.join(projectItem.dir, projectItem.metaFileName)));
  assert.equal(metaData.length, 2);
  assert(metaData[0].hash !== metaData[1].hash);
  const modules = getResources(path.resolve(projectItem.dir, projectItem.currentDirName));
  assert(modules.length > 0);
  assert.equal(
    modules.length,
    getResources(path.join(process.cwd(), 'node_modules')).length,
  );
});
