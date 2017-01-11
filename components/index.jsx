import React, {Component} from 'react';
import ReactDom from 'react-dom';
// const url = '192.241.227.176'; // Need to change to production IP/URL when deploying
const url = 'localhost';
const client = window.deepstream(`${url}:6020`);
const chalk = require('chalk');

import _ from 'lodash';

import { Row, Input, Navbar, NavItem, Icon, Button, Col } from 'react-materialize';

client.login({
  role: process.env.DEEPSTREAM_AUTH_ROLE,
  username: process.env.DEEPSTREAM_AUTH_USERNAME,
  password: process.env.DEEPSTREAM_AUTH_PASSWORD
});

class Admin extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      options: [],
      balanceOptions: { isExternal: false },
      tradeOptions: {}
    };
    this.balanceListener();
    this.dataListener();


  }
  // delete lists
  deleteList(t) {
    let entDelete = (l) => {
      client.record.getList(l).whenReady((list) => {
        let entries = list.getEntries();
        for (var j = 0; j < entries.length; j++) {
          client.record.getRecord(entries[j]).whenReady((rec) => {
            rec.delete();
          });
        }
        list.delete();
      });
    };
    for (var x = 0; x < t.length; x++) {
      if (t[x] === 'open') {
        entDelete('openBuy')
        entDelete('openSell');
      } else if (t[x] === 'closed') {
        entDelete('transactionHistory');
      }
    }
  }

  checkHandler(e) {
    console.log('check', e.target.value)
    let selection = e.target.value;
    const change = _.extend({}, this.state);
    if (this.state.options.includes(selection)) {
      let i = change.options.indexOf(selection);
      change.options.splice(i, 1);
    } else {
      change.options.push(selection);
    }
    this.setState(change);

  }

clickHandler() {
  console.log('opt', this.state.options);
  this.deleteList(this.state.options);
}


  //BALANCES
initBalance() {
  console.log('options', this.state.balanceOptions);
  client.event.emit('initBalance', this.state.balanceOptions);
}

checkBalance() {
  console.log('options', this.state.balanceOptions);
  client.event.emit('checkBalance', this.state.balanceOptions);
}

updateBalance() {
  console.log('balanceOptions', this.state.balanceOptions);
  client.event.emit('updateBalance', this.state.balanceOptions);
}

balanceListener() {
  client.event.subscribe('returnBalance', (data) => {
    console.log('user balance is', data);
  })
}

dataListener() {
  client.event.subscribe('histData', (data) => {
    console.log('data', data);
  })
}

inputHandler(e, input) {
  let value = e.target.value;
  if (input === 'currency') {
    value = value.toUpperCase();
  }

  let change = _.extend({}, this.state);
  change.balanceOptions[input] = value;
  this.setState(change);
}
checkExternal() {
  let change = _.extend({}, this.state);
  change.balanceOptions.isExternal = !this.state.balanceOptions.isExternal;
  this.setState(change);
}

//TRADES
tradeHandler(e, input) {
  let value = e.target.value;
  if (input === 'currFrom' || input === 'currTo') {
    value = value.toUpperCase();
  }
  let change = _.extend({}, this.state);
  change.tradeOptions[input] = value;
  this.setState(change);
}

transactionHandler() {
  client.event.emit('transaction', this.state.tradeOptions);
}

getData() {
  let options = {
    primaryCurrency: 'BTC',
    secondaryCurrency: 'LTC'
  }
  client.event.emit('getData', options);

}


  render() {

    const listDropper = (
      <Col s={3} className=''>
        Delete Transaction Lists
        <br/><br/>
        <Input name='group1' type='checkbox' onChange={(e) => this.checkHandler(e)} value='open' label='open' />
        <br/><br/>
        <Input name='group1' type='checkbox' onChange={(e) => this.checkHandler(e)} value='closed' label='closed' />
        <br/><br/>
        <Button onClick={() => this.clickHandler()}> Delete </Button> &nbsp;&nbsp;
      </Col>
      );

    const balances = (
      <Col s={3} className='balances'>
        Check & Update Balances
        <br/><br/>
        <Input onChange={(e) => this.inputHandler(e, 'userID')} placeholder="userID" className="user" />
        <Input onChange={(e) => this.inputHandler(e, 'currency')} placeholder="currency" className="currency" />
        <Input onChange={(e) => this.inputHandler(e, 'update')} placeholder="update" className="update" />
        <Input name='group2' type='checkbox' onChange={(e) => this.inputHandler(e, 'balanceType')} value='available' label='available' />
        <Input name='group2' type='checkbox' onChange={(e) => this.inputHandler(e, 'balanceType')} value='actual' label='actual' />
        <Input name='group2' type='checkbox' onChange={() => this.checkExternal()} value='external' label='external' />
        <Button onClick={() => this.initBalance()}>Init Balance</Button>
        <br/><br/>
        <Button onClick={() => this.checkBalance()}>Check Balance</Button>
        <br/><br/>
        <Button onClick={() => this.updateBalance()}>Update Balance</Button>
      </Col>
      );

    const trades = (
       <Col s={3} className='balances'>
        Buy & Sell Transactions
        <br/><br/>
        <Input onChange={(e) => this.tradeHandler(e, 'userID')} placeholder="userID" className="userID" />
        <Input onChange={(e) => this.tradeHandler(e, 'currFrom')} placeholder="currency from" className="currency" />
        <Input onChange={(e) => this.tradeHandler(e, 'currTo')} placeholder="currency to" className="currency" />
        <Input onChange={(e) => this.tradeHandler(e, 'price')} placeholder="price" className="price" />
        <Input onChange={(e) => this.tradeHandler(e, 'amount')} placeholder="amount" className="amount" />
        <Button onClick={() => this.transactionHandler()}>Buy</Button>
        &nbsp;&nbsp;
        <Button onClick={() => this.transactionHandler()}>Sell</Button>
      </Col>
    );

    const data = (
        <Button onClick={() => this.getData()}>Get Data!</Button>
      )

    return (
      <div>
        <Navbar brand='devTools' right>
          <NavItem href='get-started.html'><Icon>refresh</Icon></NavItem>
          <NavItem href='get-started.html'><Icon>more_vert</Icon></NavItem>
        </Navbar>
        <Row>
          {listDropper}
          {balances}
          {trades}
          {data}
        </Row>
      </div>
    );
  }
}

export default Admin;

ReactDom.render(<Admin />, document.getElementById('app'))
