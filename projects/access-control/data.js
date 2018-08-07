const {
  listAccessVariations,
  fieldAccessVariations,
  getStaticListName,
  getImperativeListName,
  getDeclarativeListName,
  getFieldName,
} = require('./cypress/integration/util');
const objMerge = require('@keystonejs/utils');

const generatedFieldData = fieldAccessVariations.reduce(
  (memo, variation) => ({
    ...memo,
    [getFieldName(variation)]: JSON.stringify(variation),
  }),
  {}
);

module.exports = {
  User: [
    {
      email: 'ticiana@keystonejs.com',
      password: 'correct',
      level: 'su',
    },
    {
      email: 'boris@keystonejs.com',
      password: 'battery',
      level: 'admin',
    },
    {
      email: 'jed@keystonejs.com',
      password: 'horse',
      level: 'editor',
    },
    {
      email: 'john@keystonejs.com',
      password: 'staple',
      level: 'writer',
    },
    {
      email: 'jess@keystonejs.com',
      password: 'xkcd',
      level: 'reader',
    },
  ].map(user => ({ ...user, noRead: 'no', yesRead: 'yes' })),
  // ensure every list has at least some data
  ...objMerge(
    listAccessVariations.map(access => ({
      [getStaticListName(access)]: [
        { foo: 'Hello', zip: 'yo', ...generatedFieldData },
        { foo: 'Hi', zip: 'yo', ...generatedFieldData },
      ],
      [getImperativeListName(access)]: [
        { foo: 'Hello', zip: 'yo', ...generatedFieldData },
        { foo: 'Hi', zip: 'yo', ...generatedFieldData },
      ],
      [getDeclarativeListName(access)]: [
        { foo: 'Hello', zip: 'yo' },
        { foo: 'Hi', zip: 'yo' },
      ],
    }))
  ),
};
