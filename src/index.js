const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use('/', express.static(path.join(__dirname, '../public')));

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});