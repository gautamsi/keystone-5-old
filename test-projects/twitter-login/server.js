const keystone = require('@keystone-alpha/core');
const {
  File,
  Text,
  Checkbox,
  Relationship,
  Select,
  Password,
  CloudinaryImage,
} = require('@keystone-alpha/fields');

const { twitterAuthEnabled, port, staticRoute, staticPath } = require('./config');
const { configureTwitterAuth } = require('./twitter');

const initialData = require('./data');

keystone
  .prepare({ port })
  .then(async ({ server, keystone: keystoneApp }) => {
    server.app.get('/reset-db', async (req, res) => {
      Object.values(keystoneApp.adapters).forEach(async adapter => {
        await adapter.dropDatabase();
      });
      await keystoneApp.createItems(initialData);
      res.redirect('/admin');
    });
    // another example of custom field in some lib
    keystoneApp.lists.User.config.fields["TestCustom"] = { type: Text };
    if (twitterAuthEnabled) {
      configureTwitterAuth(keystoneApp, server);
    }

    // server.app.use(staticRoute, server.express.static(staticPath));
    server.queueAppUse(function(app) {
      app.use(staticRoute, server.express.static(staticPath));
    });

    await server.start();

    // Initialise some data.
    // NOTE: This is only for test purposes and should not be used in production
    const users = await keystoneApp.lists.User.adapter.findAll();
    if (!users.length) {
      Object.values(keystoneApp.adapters).forEach(async adapter => {
        await adapter.dropDatabase();
      });
      await keystoneApp.createItems(initialData);
    }

    console.log(`Listening on port ${port}`);
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
