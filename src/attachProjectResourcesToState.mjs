import fs from 'node:fs';
import assert from 'node:assert';
import url from 'node:url';
import path from 'node:path';
import Ajv from 'ajv';
import shelljs from 'shelljs';
import _ from 'lodash';
import { getPathname } from '@quanxiaoxiao/node-utils';
import readProjectResources from './readProjectResources.mjs';

const codeName = path.basename(url.fileURLToPath(import.meta.url), '.mjs');

const ajv = new Ajv();

const validate = ajv.compile({
  type: 'object',
  properties: {
    key: {
      type: 'string',
    },
    title: {
      type: 'string',
      nullable: true,
    },
    routes: {
      type: 'array',
      items: {
        type: 'string',
      },
      uniqueItems: true,
    },
  },
  required: ['routes', 'key'],
});

export default (state, keyname = 'projectResources') => {
  assert(_.isPlainObject(state));
  return (_projectConfigPathname, _resourcePathname = './dist') => {
    assert(/\.json$/.test(_projectConfigPathname));
    const projectConfigPathname = getPathname(_projectConfigPathname);
    const resourceStorePathname = getPathname(_resourcePathname);
    if (!shelljs.test('-f', projectConfigPathname)) {
      console.warn(`[${codeName}] \`${projectConfigPathname}\` not found`);
      return state;
    }
    const projectResources = {};
    try {
      const data = JSON.parse(fs.readFileSync(projectConfigPathname));
      if (!shelljs.test('-d', resourceStorePathname)) {
        console.warn(`[${codeName}] create dir \`${resourceStorePathname}\``);
        shelljs.mkdir('-p', resourceStorePathname);
      }
      const projectNameList = Object.keys(data);
      for (let i = 0; i < projectNameList.length; i++) {
        const projectName = projectNameList[i];
        const projectItem = data[projectName];
        if (!validate(projectItem)) {
          console.warn(`[${codeName}] \`${projectName}\` project invalid ${JSON.stringify(validate.errors)}`);
          continue;
        }
        projectResources[projectName] = {
          ...projectItem,
          name: projectName,
          key: projectItem.key,
          routeList: projectItem.routes,
          resource: null,
          metaFileName: '.meta',
          currentDirName: '__',
          tempDirName: '_',
          dir: path.join(resourceStorePathname, projectName),
          title: projectItem.title || '',
        };
        projectResources[projectName].resource = readProjectResources(projectResources[projectName]);
      }
      state[keyname] = projectResources;
    } catch (error) {
      console.warn(`[${codeName}] ${error.message}`);
      return state;
    }
    return state;
  };
};
