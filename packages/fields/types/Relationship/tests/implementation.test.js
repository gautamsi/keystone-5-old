const gql = require('graphql-tag');
const Relationship = require('../').implementation;

class MockFieldAdapter {}

class MockListAdapter {
  newFieldAdapter = () => new MockFieldAdapter();
  prepareModel = () => {};
}

const mockFilterFragment = 'first: Int';

const mockFilterAST = [
  {
    kind: 'InputValueDefinition',
    name: {
      value: 'first',
    },
    type: {
      name: {
        value: 'Int',
      },
    },
  },
];

function createRelationship({ path, config = {} }) {
  class MockList {
    // The actual implementation in `@keystonejs/core/List/index.js` returns
    // more, but we only want to test that this codepath is called
    getGraphqlFilterFragment = () => mockFilterFragment;
  }

  return new Relationship(path, config, {
    getListByKey: () => new MockList(),
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

    const auxiliaryTypes = relationship.getGraphqlAuxiliaryTypes().join('\n');

    // We're testing the AST is as we expect it to be
    expect(gql(auxiliaryTypes)).toMatchObject({
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

  test('filter input not set on a non-"many" relationship', () => {
    const path = 'foo';

    const relationship = createRelationship({
      path,
      config: { many: false, ref: 'Zip' },
    });

    // Test that the relationship type is not added
    const auxiliaryTypes = relationship.getGraphqlAuxiliaryTypes().join('\n');
    const auxAST = gql(auxiliaryTypes);
    expect(auxAST).toHaveProperty('definitions');
    expect(auxAST.definitions).toHaveLength(1);
  });

  test('filter input set on a "many" relationship', () => {
    const relationship = createRelationship({
      path: 'foo',
      config: { many: true, ref: 'Zip' },
    });

    const auxiliaryTypes = relationship.getGraphqlAuxiliaryTypes().join('\n');

    // We're testing the AST is as we expect it to be
    expect(gql(auxiliaryTypes)).toMatchObject({
      definitions: [
        {}, // Ignore the first one
        {
          kind: 'InputObjectTypeDefinition',
          name: {
            value: 'ZipRelationshipQueryInput',
          },
          fields: mockFilterAST,
        },
      ],
    });
  });
});
