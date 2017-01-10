const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const chalk = require('chalk');
const shell = require('shelljs');
const r = require('rethinkdb');

const deepstream = require('deepstream.io-client-js');
const deepstreamServer = process.env.NODE_ENV === 'prod' ? 'deepstream' : 'localhost';
const auth = process.env.NODE_ENV === 'prod' ? {
  role: process.env.DEEPSTREAM_AUTH_ROLE,
  username: process.env.DEEPSTREAM_AUTH_USERNAME,
  password: process.env.DEEPSTREAM_AUTH_PASSWORD } : {};

const connect = deepstream(`${deepstreamServer}:6020`).login(auth);

const app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use('/', express.static(path.join(__dirname, '../public')));

const port = 3005;

app.listen(port, () => {
  console.log(chalk.magenta(`admin on ${port}!///////////////`));
});

// Connect to rethinkdb
// r.connect({
//     db: 'Pandas_MacBook_Air_local_by7'
// }, function(err, conn) {
//     // ...
//     if (err) {
//       console.log('err', err);
//     } else {
//       console.log('connected to db!');
//     }
// });
// var x = r.db('Pandas_MacBook_Air_local_by7').tableList();
// console.log(x);
// shell.echo('Nick is in the closet');
// shell.exec('node --version', {async: true}).stdout;

/** Delete deepstream_records **/
// const deleteRecords = (r) => {
//
//   // delete deepstream_record
//   connect.record.getRecord(/^open\/.*/).whenReady((recrec) => {
//     console.log(recrec.get());
//   });
// }
/** TEST **/

// Function that creates a sample list
const createTestList = (x, type, num, user, currency) => {
  x.whenReady((newList) => {
    for (let h = 0; h < num; h++) {
      let unique = connect.getUid();
      let newSellRecord = connect.record.getRecord(`open/${unique}`);
      newSellRecord.whenReady((newRec) => {
        newRec.set({
            amount: Math.ceil(Math.random()*10),
            price: Math.ceil(Math.random()*100),
            userID: user,
            currency: currency,
            type: type
        }, err => {
          if (err) {
            console.log(`${type} record set with error:`, err)
          } else {
            console.log(`${type} record set without error`);
            newList.addEntry(`open/${unique}`);
          }
        });
      });
    }
  });
};

// Function getLists
const getLists = (x, whatList) => {
  x.whenReady((list) => {
    var entries = list.getEntries();
    console.log(`${whatList} list`, entries);
    for (var i = 0; i < entries.length; i++) {
      connect.record.getRecord(entries[i]).whenReady((record) => {
        let price = record.get();
        console.log(`${whatList} list: `, price, record.name);
      });
    }
  });
};


/** Create OPEN and CLOSED lists **/
/** Display OPEN and CLOSED lists **/
// Open Buy Orders
let openBuy = connect.record.getList('openBuy');
// Open Sell Orders
let openSell = connect.record.getList('openSell');
// Transaction History
let transactionHistory = connect.record.getList('transactionHistory');

// Create a sample list
// createTestList(openSell, 'sell', 5, 'nick', 'BTC');
// createTestList(openBuy, 'buy', 5, 'harry', 'BTC');

// console each list
getLists(openBuy, 'buy');
getLists(openSell, 'sell');
getLists(transactionHistory, 'transaction history');

// delete every list
// deleteList(['open', 'closed']);
/** END OF TEST **/
