const {
  Mongoose,
  Types: { ObjectId },
} = require('mongoose');
const inflection = require('inflection');
const {
  escapeRegExp,
  pick,
  getType,
  mapKeys,
  mapKeyNames,
  objMerge,
} = require('@keystonejs/utils');
const {
  BaseKeystoneAdapter,
  BaseListAdapter,
  BaseFieldAdapter,
} = require('@keystonejs/core/adapters');
const joinBuilder = require('@keystonejs/mongo-join-builder');

const simpleTokenizer = require('./tokenizers/simple');
const relationshipTokenizer = require('./tokenizers/relationship');
const getRelatedListAdapterFromQueryPathFactory = require('./tokenizers/relationship-path');

const debugMongoose = () => !!process.env.DEBUG_MONGOOSE;

function getMongoURI({ dbName, name }) {
  return (
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGODB_URL ||
    `mongodb://localhost:27017/${dbName || inflection.dasherize(name).toLowerCase()}`
  );
}

const idQueryConditions = {
  // id is how it looks in the schema
  // _id is how it looks in the MongoDB
  id: value => ({ _id: { $eq: ObjectId(value) } }),
  id_not: value => ({ _id: { $ne: ObjectId(value) } }),
  id_in: value => ({ _id: { $in: value.map(id => ObjectId(id)) } }),
  id_not_in: value => ({ _id: { $not: { $in: value.map(id => ObjectId(id)) } } }),
};

const modifierConditions = {
  // TODO: Implement configurable search fields for lists
  $search: value => {
    if (!value || (getType(value) === 'String' && !value.trim())) {
      return undefined;
    }
    return {
      $match: {
        name: new RegExp(`${escapeRegExp(value)}`, 'i'),
      },
    };
  },

  $orderBy: value => {
    const [orderField, orderDirection] = value.split('_');

    return {
      $sort: {
        [orderField]: orderDirection === 'ASC' ? 1 : -1,
      },
    };
  },

  $skip: value => {
    if (value < Infinity && value > 0) {
      return {
        $skip: value,
      };
    }
  },

  $first: value => {
    if (value < Infinity && value > 0) {
      return {
        $limit: value,
      };
    }
  },

  $count: value => ({
    $count: value,
  }),
};

class MongooseAdapter extends BaseKeystoneAdapter {
  constructor() {
    super(...arguments);

    this.name = this.name || 'mongoose';

    this.mongoose = new Mongoose();
    if (debugMongoose()) {
      this.mongoose.set('debug', true);
    }
    this.listAdapterClass = this.listAdapterClass || this.defaultListAdapterClass;
  }

  connect(to, config) {
    const { name, dbName, ...adapterConnectOptions } = config;
    const uri = to || getMongoURI({ name, dbName });
    this.mongoose.connect(
      uri,
      { useNewUrlParser: true, ...adapterConnectOptions }
    );
    const db = this.mongoose.connection;
    db.on('error', console.error.bind(console, 'Mongoose connection error'));
    return new Promise(resolve => {
      db.once('open', () => {
        console.log('Connection success');
        resolve();
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      console.log('Close connection');
      this.mongoose.connection.close(true, error => {
        if (error) {
          console.log('Failed');
          return reject(error);
        }
        console.log('Closed. Disconnecting');
        resolve(this.mongoose.disconnect());
      });
    });
  }

  dropDatabase() {
    // This will completely drop the backing database. Use wisely.
    return this.mongoose.connection.dropDatabase();
  }
}

class MongooseListAdapter extends BaseListAdapter {
  constructor(key, parentAdapter, config) {
    super(...arguments);

    const { configureMongooseSchema, mongooseSchemaOptions } = config;

    this.getListAdapterByKey = parentAdapter.getListAdapterByKey.bind(parentAdapter);
    this.mongoose = parentAdapter.mongoose;
    this.configureMongooseSchema = configureMongooseSchema;
    this.schema = new parentAdapter.mongoose.Schema({}, mongooseSchemaOptions);

    // Need to call prepareModel() once all fields have registered.
    this.model = null;

    this.queryBuilder = joinBuilder({
      tokenizer: {
        // executed for simple query components (eg; 'fulfilled: false' / name: 'a')
        simple: simpleTokenizer({
          getRelatedListAdapterFromQueryPath: getRelatedListAdapterFromQueryPathFactory(this),
          modifierConditions,
        }),
        // executed for complex query components (eg; items: { ... })
        relationship: relationshipTokenizer({
          getRelatedListAdapterFromQueryPath: getRelatedListAdapterFromQueryPathFactory(this),
        }),
      },
    });
  }

  getFieldAdapterByQueryConditionKey(queryCondition) {
    return this.fieldAdapters.find(adapter => adapter.hasQueryCondition(queryCondition));
  }

  getSimpleQueryConditions() {
    return {
      ...idQueryConditions,
      ...objMerge(this.fieldAdapters.map(fieldAdapter => fieldAdapter.getQueryConditions())),
    };
  }

  getRelationshipQueryConditions() {
    return objMerge(
      this.fieldAdapters.map(fieldAdapter => fieldAdapter.getRelationshipQueryConditions())
    );
  }

  prepareFieldAdapter(fieldAdapter) {
    fieldAdapter.addToMongooseSchema(this.schema, this.mongoose);
  }

  prepareModel() {
    if (this.configureMongooseSchema) {
      this.configureMongooseSchema(this.schema, { mongoose: this.mongoose });
    }
    this.model = this.mongoose.model(this.key, this.schema);
  }

  create(data) {
    return this.model.create(data);
  }

  delete(id) {
    return this.model.findByIdAndRemove(id);
  }

  update(id, update, options) {
    return this.model.findByIdAndUpdate(id, update, options);
  }

  findAll() {
    return this.model.find();
  }

  findById(id) {
    return this.model.findById(id);
  }

  find(condition) {
    return this.model.find(condition);
  }

  findOne(condition) {
    return this.model.findOne(condition);
  }

  itemsQuery(args, { meta = false } = {}) {
    function graphQlQueryToMongoJoinQuery(query) {
      const joinQuery = {
        ...query.where,
        ...mapKeyNames(
          // Grab all the modifiers
          pick(query || {}, ['search', 'orderBy', 'skip', 'first']),
          // and prefix with a dollar symbol so they can be picked out by the
          // query builder tokeniser
          key => `$${key}`
        ),
      };

      return mapKeys(joinQuery, field => {
        if (getType(field) !== 'Object' || !field.where) {
          return field;
        }

        // recurse on object (ie; relationship) types
        return graphQlQueryToMongoJoinQuery(field);
      });
    }

    let query;
    try {
      query = graphQlQueryToMongoJoinQuery(args);
    } catch (error) {
      return Promise.reject(error);
    }

    if (meta) {
      // Order is important here, which is why we do it last (v8 will append the
      // key, and keep them stable)
      query.$count = 'count';
    }

    return this.queryBuilder(query, pipeline => this.model.aggregate(pipeline).exec()).then(
      data => {
        if (meta) {
          // When there are no items, we get undefined back, so we simulate the
          // normal result of 0 items.
          if (!data[0]) {
            return { count: 0 };
          }
          return data[0];
        }

        return data;
      }
    );
  }

  itemsQueryMeta(args) {
    return this.itemsQuery(args, { meta: true });
  }
}

class MongooseFieldAdapter extends BaseFieldAdapter {
  addToMongooseSchema() {
    throw new Error(`Field type [${this.fieldName}] does not implement addToMongooseSchema()`);
  }

  getQueryConditions() {
    return {};
  }

  getRelationshipQueryConditions() {
    return {};
  }

  getRefListAdapter() {
    return undefined;
  }

  hasQueryCondition() {
    return false;
  }
}

MongooseAdapter.defaultListAdapterClass = MongooseListAdapter;

module.exports = {
  MongooseAdapter,
  MongooseListAdapter,
  MongooseFieldAdapter,
};
