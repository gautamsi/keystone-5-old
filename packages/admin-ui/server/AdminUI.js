const qs = require('qs');
const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const webpack = require('webpack');
const { apolloUploadExpress } = require('apollo-upload-server');
const { graphqlExpress, graphiqlExpress } = require('apollo-server-express');
const ParcelBundler = require('parcel-bundler');

function serveViaParcel({ app, entry, publicUrl }) {
  const options = {
    outDir: `./dist${publicUrl}`, // The out directory to put the build files in, defaults to dist
    outFile: 'index.html', // The name of the outputFile
    publicUrl, // The url to server on, defaults to dist
    logLevel: 3, // 3 = log everything, 2 = log warnings & errors, 1 = log errors
    hmrPort: 0, // The port the hmr socket runs on, defaults to a random free port (0 in node.js resolves to a random free port)
  };

  const middleware = (new Bundler(entry, options)).middleware();

  app.use(publicUrl, (req, res, next) => {
    // parcel bases its requests on the `req.url` option, which express
    // helpfully(?) rewrites to exclude the matched path.
    // We add back in the entire url so parcel knows what to do
    req.url = req.originalUrl;
    return middleware(req, res, next);
  });
}


function injectQueryParams({ url, params, overwrite = true }) {
  const parsedUrl = new URL(url);
  let queryObject = qs.parse(parsedUrl.search.slice(1));
  if (overwrite) {
    queryObject = {
      ...queryObject,
      ...params,
    };
  } else {
    queryObject = {
      ...params,
      ...queryObject,
    };
  }
  parsedUrl.search = qs.stringify(queryObject);
  return parsedUrl.toString();
}

function getAbsoluteUrl(req, path) {
  return `${req.protocol}://${req.get('host')}${path}`;
}

module.exports = class AdminUI {
  constructor(keystone, config) {
    this.keystone = keystone;

    if (config.adminPath === '/') {
      throw new Error("Admin path cannot be the root path. Try; '/admin'");
    }

    this.adminPath = config.adminPath;
    // TODO: Figure out how to have auth & non-auth URLs share the same path
    this.graphiqlPath = `${this.adminPath}/graphiql`;
    this.apiPath = `${this.adminPath}/api`;
    this.authPath = `${this.adminPath}/auth`;

    this.config = {
      ...config,
      signinUrl: `${this.authPath}/signin`,
      signoutUrl: `${this.authPath}/signout`,
      sessionUrl: `${this.authPath}/session`,
    };

    this.signin = this.signin.bind(this);
    this.signout = this.signout.bind(this);
    this.session = this.session.bind(this);
  }

  async signin(req, res, next) {
    try {
      // TODO: Don't hard code this auth strategy, use the one passed in
      // TODO: How could we support, for example, the twitter auth flow?
      const result = await this.keystone.auth.User.password.validate({
        username: req.body.username,
        password: req.body.password,
      });

      if (!result.success) {
        const htmlResponse = () => {
          const signinUrl = this.config.signinUrl;
          /*
           * This works, but then webpack (or react-router?) is unable to match
           * the URL when there's a query param, which is... odd :/
          const signinUrl = injectQueryParams({
            url: getAbsoluteUrl(req, this.config.signinUrl),
            params: { redirectTo: req.body.redirectTo },
            overwrite: false,
          });
          */

          // TODO - include some sort of error in the page
          res.redirect(signinUrl);
        };
        return res.format({
          default: htmlResponse,
          'text/html': htmlResponse,
          'application/json': () => res.json({ success: false }),
        });
      }

      await this.keystone.session.create(req, result);
    } catch (e) {
      return next(e);
    }

    const htmlResponse = () =>
      res.redirect(req.body.redirectTo || this.adminPath);

    return res.format({
      default: htmlResponse,
      'text/html': htmlResponse,
      'application/json': () => res.json({ success: true }),
    });
  }

  async signout(req, res, next) {
    try {
      await this.keystone.session.destroy(req);
    } catch (e) {
      return next(e);
    }

    return res.format({
      default: () => {
        next();
      },
      'text/html': () => {
        next();
      },
      'application/json': () => {
        res.json({ success: true });
      },
    });
  }

  session(req, res) {
    const result = {
      signedIn: !!req.user,
      user: req.user ? { id: req.user.id, name: req.user.name } : undefined,
    };
    res.json(result);
  }

  getAdminMeta() {
    return {
      withAuth: !!this.config.authStrategy,
      signinUrl: this.config.signinUrl,
      signoutUrl: this.config.signoutUrl,
      sessionUrl: this.config.sessionUrl,
    };
  }

  createSessionMiddleware({ cookieSecret }) {
    if (!this.config.authStrategy) {
      return (req, res, next) => next();
    }

    const app = express();

    // implement session management
    app.use(
      this.adminPath,
      session({
        secret: cookieSecret,
        resave: false,
        saveUninitialized: false,
        name: 'keystone-admin.sid',
      })
    );

    // NOTE: These are POST only. The GET versions (the UI) are handled by the
    // main server
    app.post(
      this.config.signinUrl,
      bodyParser.json(),
      bodyParser.urlencoded(),
      this.signin
    );
    app.post(this.config.signoutUrl, this.signout);
    app.use(
      this.keystone.session.validate({
        valid: ({ req, item }) => (req.user = item),
      })
    );
    app.get(this.config.sessionUrl, this.session);

    const authCheck = (req, res, next) => {
      console.log('authCheck');
      // NOTE: No auth check on this.authPath, that's because we rely on the
      // UI code to only handle the signin/signout routes.
      // THIS IS NOT SECURE! We need proper server-side handling of this, and
      // split the signin/out pages into their own bundle so we don't leak admin
      // data to the browser.
      if (!req.originalUrl.startsWith(this.authPath) && !req.user) {
        console.log('redirecting');
        const signinUrl = this.config.signinUrl;
        /*
         * This works, but then webpack (or react-router?) is unable to match
         * the URL when there's a query param, which is... odd :/
        const signinUrl = injectQueryParams({
          url: getAbsoluteUrl(req, this.config.signinUrl),
          params: { redirectTo: req.originalUrl },
          overwrite: true,
        });
        */
        return res.status(401).redirect(signinUrl);
      }
      // All logged in, so move on to the next matching route
      next();
    };
    app.use(`${this.adminPath}/*`, authCheck);
    app.use(`${this.adminPath}`, authCheck);
    return app;
  }

  createGraphQLMiddleware() {
    const app = express();

    // add the Admin GraphQL API
    const schema = this.keystone.getAdminSchema();
    app.use(
      this.apiPath,
      bodyParser.json(),
      // TODO: Make configurable
      apolloUploadExpress({ maxFileSize: 200 * 1024 * 1024, maxFiles: 5 }),
      graphqlExpress({ schema })
    );
    app.use(this.graphiqlPath, graphiqlExpress({ endpointURL: this.apiPath }));
    return app;
  }

  createDevMiddleware() {
    const app = express();


    if (this.config.authStrategy) {
      serveViaParcel({
        app,
        entry: '../index.html',
        publicUrl: '/admin/auth',
      });

    serveViaParcel({ app, entry: './client/index.html', publicUrl: '/admin' });

    // ensure any non-resource requests are rewritten for history api fallback
    //app.use(this.adminPath, (req, res, next) => {
    //  console.log('resource rewrite');
    //  // TODO: Confirm what this is matching against. Why is it necessary to
    //  // rewrite the url?
    //  if (/^[\w\/\-]+$/.test(req.url)) req.url = '/';
    //  next();
    //});

    // add the webpack dev middleware
    // TODO: Replace with local server so we can add ACL / stop leaking admin
    // data when not logged in
    const webpackConfig = getWebpackConfig({
      adminMeta: {
        ...this.getAdminMeta(),
        ...this.keystone.getAdminMeta(),
      },
      publicPath: this.adminPath,
      adminPath: this.adminPath,
      apiPath: this.apiPath,
      graphiqlPath: this.graphiqlPath,
      title: this.keystone.config.name ? `${this.keystone.config.name} | Admin` : 'KeystoneJS',
    });

    const compiler = webpack(webpackConfig);
    this.webpackMiddleware = webpackDevMiddleware(compiler, {
      publicPath: webpackConfig.output.publicPath,
      stats: 'minimal',
    });

    let authWebpackMiddleware;

    if (this.config.authStrategy) {
      console.log('Setting up Auth Strategy');
      const authWebpackConfig = getWebpackConfig({
        adminMeta: {
          ...this.getAdminMeta(),
          ...this.keystone.getAdminMeta(),
        },
        publicPath: this.authPath,
        adminPath: this.adminPath,
        apiPath: this.apiPath,
        graphiqlPath: this.graphiqlPath,
        title: this.keystone.config.name ? `${this.keystone.config.name} | Authentication` : 'KeystoneJS',
      });
      const authCompiler = webpack(authWebpackConfig);
      authWebpackMiddleware = webpackDevMiddleware(authCompiler, {
        publicPath: webpackConfig.output.publicPath,
        stats: 'minimal',
      });

      app.use((req, res, next) => {
        console.log('HIT authPath: ', req.originalUrl, req.url);
        //req.url = req.originalUrl;
        if (req.originalUrl.startsWith(this.authPath) && /^[\w\/\-]+$/.test(req.url)) req.url = '/';
        authWebpackMiddleware(req, res, (error) => {
          if (error) {
            return next(error);
          }
          // Don't let this route fall through
          return next();
        });
      });
    }
      /*
    app.use(this.adminPath, (req, res, next) => {
      console.log('HIT adminPath: ', req.originalUrl, req.url);
      //req.url = req.originalUrl;
      if (/^[\w\/\-]+$/.test(req.url)) req.url = '/';
      this.webpackMiddleware(req, res, next);
    });
    */

    // handle errors
    // eslint-disable-next-line no-unused-vars
    app.use(function(err, req, res, next) {
      console.error(err.stack);
      res.status(500).send('Error');
    });

    return app;
  }
};
