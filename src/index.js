const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const chalk = require('chalk');

const app = express();

if (process.env.NODE_ENV !== 'prod') {
  const webpack = require('webpack');
  const webpackDevMiddleware = require("webpack-dev-middleware");
  const webpackHotMiddleware = require("webpack-hot-middleware");
  const config = require('../webpack.config.js');
  const compiler = webpack(config);

  app.use(webpackDevMiddleware(compiler, {
    hot: true,
    filename: 'bundle.js',
    stats: {
      chunks:false,
      colors: true,
    },
    historyApiFallback: true
  }));
  
  app.use(webpackHotMiddleware(compiler, {
    log: console.log,
    path: '/__webpack_hmr',
    heartbeat: 10 * 1000,
  }));
}

app.use(morgan('combined'));
app.use(bodyParser.json());
app.use('/', express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const port = process.env.PORT || 3005;

app.listen(port, () => {
  console.log(chalk.red(`admin on ${port}!///////////////`));
});
