const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const { mode } = require('./env');

module.exports = function({
  publicPath,
  adminMeta,
  adminPath,
  apiPath,
  graphiqlPath,
  title,
}) {
  return {
    mode,
    context: path.resolve(__dirname, '../client/'),
    devtool: mode === 'development' ? 'inline-source-map' : undefined,
    entry: './index.js',
    // When we have 2 dev servers running (one for auth, the other for admin),
    // they need to server assets from unique paths so we can correctly limit
    // access.
    // To do so, we make sure webpack is serving the assets from the sub-path.
    // Combined with the devServer.historyApiFallback option, this allows
    // react-router to handle the HTML routes based on the root path, and
    // webpack to handle the asset routes correctly.
    //output: {
    //  path: path.join(__dirname, 'dist'),
    //  filename: 'bundle.js',
    //  publicPath, //: `/${publicPath.replace(/^\/*(.*?)\/*$/, '$1')}/`,
    //},
    output: {
      filename: 'bundle.js',
      publicPath,
    },
    devServer: {
      // 404's are forwarded on to the index.html file (ie; so react-router can
      // handle the path and 'route' correctly in the browser)
      historyApiFallback: true,
    },
    plugins: [
      new webpack.DefinePlugin({
        KEYSTONE_ADMIN_META: JSON.stringify({
          adminPath,
          apiPath,
          graphiqlPath,
          ...adminMeta,
        }),
      }),
      new HtmlWebpackPlugin({
        title,
        template: 'index.html',
      }),
    ],
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: [/node_modules(?!\/@keystone\/)/],
          use: [
            {
              loader: 'babel-loader',
            },
          ],
        },
        {
          test: /\.(png|svg|jpg|gif)$/,
          use: ['file-loader'],
        },
        {
          test: /FIELD_TYPES/,
          use: [
            {
              loader: '@keystone/field-views-loader',
              options: {
                adminMeta,
              },
            },
          ],
        },
      ],
    },
  };
};
