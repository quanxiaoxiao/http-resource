import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import { getPathname } from '@quanxiaoxiao/node-utils';
import Ajv from 'ajv';
import _ from 'lodash';
import shelljs from 'shelljs';

import readProjectResources from './readProjectResources.mjs';

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

const readProjectConfig = (projectConfigPathname) => {
  try {
    const data = fs.readFileSync(projectConfigPathname, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn(`Failed to read/parse project config: ${error.message}`);
    return null;
  }
};

const ensureResourceStoreDir = (resourceStorePathname) => {
  if (!shelljs.test('-d', resourceStorePathname)) {
    shelljs.mkdir('-p', resourceStorePathname);
  }
};

export default (state, keyname = 'projectResources') => {
  assert(_.isPlainObject(state), 'State must be a plain object');
  assert(typeof keyname === 'string', 'Keyname must be a string');

  return (projectConfigPathname, resourcePathname = './dist') => {
    assert(typeof projectConfigPathname === 'string', 'Project config pathname must be a string');
    assert(/\.json$/.test(projectConfigPathname, 'Project config file must have .json extension'));

    const resolvedProjectConfigPathname = getPathname(projectConfigPathname);
    const resourceStorePathname = getPathname(resourcePathname);

    if (!shelljs.test('-f', resolvedProjectConfigPathname)) {
      console.warn(`Project config file "${resolvedProjectConfigPathname}" not found`);
      return state;
    }

    const configData = readProjectConfig(resolvedProjectConfigPathname);
    if (!configData) {
      return state;
    }

    ensureResourceStoreDir(resourceStorePathname);

    const projectResources = {};
    const projectNameList = Object.keys(configData);

    for (const projectName of projectNameList) {
      const projectItem = configData[projectName];
      if (!validate(projectItem)) {
        console.warn(`Project "${projectName}" is invalid: ${JSON.stringify(validate.errors)}`);
      } else {
        const projectResource = {
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
        projectResource.resource = readProjectResources(projectResource);
        projectResources[projectName] = projectResource;
      }
    }

    state[keyname] = projectResources;
    return state;
  };
};
