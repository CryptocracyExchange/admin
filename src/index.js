const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const chalk = require('chalk');
const app = express();

app.use(morgan('combined'));
app.use(bodyParser.json());
app.use('/', express.static(path.join(__dirname, '../public')));

const port = 3005;

app.listen(port, () => {
  console.log(chalk.magenta(`admin on ${port}!///////////////`));
});

