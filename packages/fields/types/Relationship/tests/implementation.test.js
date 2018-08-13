const gql = require('graphql-tag');
const Relationship = require('../').implementation;

class MockFieldAdapter {}

class MockListAdapter {
  newFieldAdapter = () => new MockFieldAdapter();
  prepareModel = () => {};
}

function createRelationship({ path, config = {} }) {
  return new Relationship(path, config, {
    getListByKey: () => {},
    listKey: 'FakeList',
    listAdapter: new MockListAdapter(),
    fieldAdapterClass: MockFieldAdapter,
    defaultAccess: true,
  });
}

describe('Type Generation', () => {
  test('inputs for relationship fields in create args', () => {
    const relMany = createRelationship({
      path: 'foo',
      config: { many: true, ref: 'Zip' },
    });
    expect(relMany.getGraphqlCreateArgs()).toEqual(
      'foo: [ZipRelationshipInput]'
    );

    const relSingle = createRelationship({
      path: 'foo',
      config: { many: false, ref: 'Zip' },
    });
    expect(relSingle.getGraphqlCreateArgs()).toEqual(
      'foo: ZipRelationshipInput'
    );
  });

  test('inputs for relationship fields in update args', () => {
    const relMany = createRelationship({
      path: 'foo',
      config: { many: true, ref: 'Zip' },
    });
    expect(relMany.getGraphqlUpdateArgs()).toEqual(
      'foo: [ZipRelationshipInput]'
    );

    const relSingle = createRelationship({
      path: 'foo',
      config: { many: false, ref: 'Zip' },
    });
    expect(relSingle.getGraphqlUpdateArgs()).toEqual(
      'foo: ZipRelationshipInput'
    );
  });

  test('relationship LinkOrCreate input', () => {
    const relationship = createRelationship({
      path: 'foo',
      config: { many: false, ref: 'Zip' },
    });

    // We're testing the AST is as we expect it to be
    expect(gql(relationship.getGraphqlAuxiliaryTypes())).toMatchObject({
      definitions: [
        {
          kind: 'InputObjectTypeDefinition',
          name: {
            value: 'ZipRelationshipInput',
          },
          fields: [
            {
              kind: 'InputValueDefinition',
              name: {
                value: 'id',
              },
              type: {
                name: {
                  value: 'ID',
                },
              },
            },
            {
              kind: 'InputValueDefinition',
              name: {
                value: 'create',
              },
              type: {
                name: {
                  value: 'ZipCreateInput',
                },
              },
            },
          ],
        },
      ],
    });
  });
});
