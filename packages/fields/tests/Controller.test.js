const fs = require('fs');
const path = require('path');
const gql = require('graphql-tag');
const { print } = require('graphql/language/printer');
import List from '../../core/List';
import FieldController from '../Controller';

const adapter = {
  newListAdapter: jest.fn(() => ({
    newFieldAdapter: jest.fn(() => {}),
    prepareModel: jest.fn(() => {}),
  })),
};

const defaultAccess = { list: true, field: true };

const getListByKey = jest.fn(() => ({ gqlNames: {} }));

export const buildController = (fields, controllerClass) => {
  let getAuth;
  const list = new List('testList', { fields }, { getListByKey, adapter, defaultAccess, getAuth });
  const field = list.getAdminMeta().fields.find(f => f.path === 'target');
  return new controllerClass({ path: field.path }, list, field);
};

// Convert a gql field into a normalised format for comparison.
// Needs to be wrapped in a mock type for gql to correctly parse it.
export const normalise = s => print(gql(`{ ${s} }`));

const config = {
  path: 'path',
  label: 'label',
  type: 'type',
  list: 'list',
  defaultValue: 'default',
};

describe('new Controller()', () => {
  test('new Controller() - Smoke test', () => {
    const controller = new FieldController(config, 'list', { gqlOutputFields: ['path: String'] });
    expect(controller).not.toBeNull();

    expect(controller.config).toEqual(config);
    expect(controller.label).toEqual('label');
    expect(controller.type).toEqual('type');
    expect(controller.list).toEqual('list');
    expect(controller.adminMeta).toEqual({ gqlOutputFields: ['path: String'] });
  });
});

test('gqlQueryFragments', () => {
  const controller = new FieldController(config, 'list', { gqlOutputFields: ['path: String'], gqlAuxTypes: [] });

  const value = controller.gqlQueryFragments;
  expect(value).toEqual(['path']);
});

describe('getValue()', () => {
  test('getValue() - path exists', () => {
    const controller = new FieldController(config, 'list', { gqlOutputFields: ['path: String'] });
    let value = controller.getValue({ path: 'some_value' });
    expect(value).toEqual('some_value');
  });

  test('getValue() - path does not exist', () => {
    const controller = new FieldController(config, 'list', { gqlOutputFields: ['path: String'] });
    const value = controller.getValue({});
    expect(value).toEqual('');
  });
});

describe('getInitialData()', () => {
  test('getInitialData() - Default defined', () => {
    const controller = new FieldController(config, 'list', { gqlOutputFields: ['path: String'] });
    const value = controller.getInitialData();
    expect(value).toEqual('default');
  });

  test('getInitialData() - No default', () => {
    const controller = new FieldController({}, 'list', { gqlOutputFields: ['path: String'] });
    const value = controller.getInitialData();
    expect(value).toEqual('');
  });
});

describe('Test Controller for all fields', () => {
  const typesLoc = path.resolve('packages/fields/types');
  fs.readdirSync(typesLoc)
    .map(name => `${typesLoc}/${name}/controllerTests.js`)
    .filter(filename => fs.existsSync(filename))
    .map(require)
    .forEach(mod => {
      describe(`Test Controller for ${mod.name}`, () => {
        mod.controllerTests();
      });
    });
});
