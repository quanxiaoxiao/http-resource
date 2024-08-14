import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import assert from 'node:assert';
import test from 'node:test';
import shelljs from 'shelljs';
import { readFileList, sha256 } from '@quanxiaoxiao/node-utils';
import storeProjectResources from './storeProjectResources.mjs';

const calcHash = (hashList) => {
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

test('storeProjectResources', () => {
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
  storeProjectResources(projectItem);
  assert(shelljs.test('-d', projectItem.dir));
  assert(shelljs.test('-f', path.resolve(projectItem.dir, projectItem.metaFileName)));
  assert(!shelljs.test('-d', path.resolve(projectItem.dir, projectItem.currentDirName)));
  assert(!shelljs.test('-d', path.resolve(projectItem.dir, projectItem.tempDirName)));

  shelljs.cp('-R', sourceDir, path.resolve(projectItem.dir, projectItem.tempDirName));
  assert(shelljs.test('-d', path.resolve(projectItem.dir, projectItem.tempDirName)));
  storeProjectResources(projectItem);
  assert(!shelljs.test('-d', path.resolve(projectItem.dir, projectItem.tempDirName)));
  assert(shelljs.test('-d', path.resolve(projectItem.dir, projectItem.currentDirName)));

  const sourceFilepathList = readFileList(sourceDir);
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
  const hash = calcHash(hashList);
  const resourceStoreDir = path.join(projectItem.dir, hash);
  assert(shelljs.test('-d', resourceStoreDir));
  const resourcePathnameList = readFileList(resourceStoreDir);
  const hashList2 = [];
  for (let i = 0; i < sourceFilepathList.length; i++) {
    hashList2.push(sha256(fs.readFileSync(resourcePathnameList[i])));
  }
  assert.equal(calcHash(hashList2), hash);
  let metaData = JSON.parse(fs.readFileSync(path.join(projectItem.dir, projectItem.metaFileName)));
  assert.equal(metaData.length, 1);
  assert.equal(metaData[0].hash, hash);

  assert(!shelljs.test('-d', path.resolve(projectItem.dir, projectItem.tempDirName)));
  shelljs.cp('-R', sourceDir, path.resolve(projectItem.dir, projectItem.tempDirName));
  storeProjectResources(projectItem);
  metaData = JSON.parse(fs.readFileSync(path.join(projectItem.dir, projectItem.metaFileName)));
  assert.equal(metaData.length, 1);
  assert.equal(metaData[0].hash, hash);
  assert(!shelljs.test('-d', path.resolve(projectItem.dir, projectItem.tempDirName)));
  shelljs.cp('-R', path.join(process.cwd(), 'node_modules'), path.resolve(projectItem.dir, projectItem.tempDirName));
  storeProjectResources(projectItem);
  metaData = JSON.parse(fs.readFileSync(path.join(projectItem.dir, projectItem.metaFileName)));
  assert.equal(metaData.length, 2);
  assert(metaData[0].hash !== metaData[1].hash);
  const modules  = readFileList(path.resolve(projectItem.dir, projectItem.currentDirName));
  assert(modules.length > 0);
  assert.equal(
    modules.length,
    readFileList(path.join(process.cwd(), 'node_modules')).length,
  );
});
