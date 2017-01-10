import React, {Component} from 'react';
import ReactDom from 'react-dom';
// const url = '192.241.227.176'; // Need to change to production IP/URL when deploying
const url = 'localhost';
const client = require('deepstream.io-client-js')(`${url}:6020`);
const chalk = require('chalk');
import { deleteList } from '../src/index.js';
import _ from 'lodash';

import { Row, Input, Navbar, NavItem, Icon, Button, Col } from 'react-materialize';




client.login();

const auth = process.env.NODE_ENV === 'prod' ? {
  role: process.env.DEEPSTREAM_AUTH_ROLE,
  username: process.env.DEEPSTREAM_AUTH_USERNAME,
  password: process.env.DEEPSTREAM_AUTH_PASSWORD } : {};

class Admin extends React.Component {
  constructor(props) {
    super(props);
  
    this.state = {
      options: [],
      balanceOptions: {},
      tradeOptions: {}
    };
    this.balanceListener();

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
  deleteList(this.state.options);
}


  //BALANCES
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

inputHandler(e, input) {
  let value = e.target.value;
  if (input === 'currency') {
    value = value.toUpperCase();
  }

  let change = _.extend({}, this.state);
  change.balanceOptions[input] = value;
  this.setState(change);
}

tradeHandler(e, input) {
  let value = e.target.value;
  if (input === 'currency') {
    value = value.toUpperCase();
  }
  let change = _.extend({}, this.state);
  change.tradeOptions[input] = value;
  this.setState(change);
}

transactionHandler(type) {
  client.event.emit('transaction' + type, this.state.tradeOptions);
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
        (currency types in all CAPS)
        <br/><br/>
        <Input onChange={(e) => this.inputHandler(e, 'userID')} placeholder="userID" className="user" />
        <Input onChange={(e) => this.inputHandler(e, 'currency')} placeholder="currency" className="currency" />
        <Input onChange={(e) => this.inputHandler(e, 'update')} placeholder="update" className="update" />
        <Button onClick={() => this.checkBalance()}>Check Balance</Button>
        <br/><br/>
        <Button onClick={() => this.updateBalance()}>Update Balance</Button>
      </Col>
      );

    const trades = (
       <Col s={3} className='balances'>
        Buy & Sell Transactions
        (currency types in all CAPS)
        <br/><br/>
        <Input onChange={(e) => this.tradeHandler(e, 'userID')} placeholder="userID" className="userID" />
        <Input onChange={(e) => this.tradeHandler(e, 'currency')} placeholder="currency" className="currency" />
        <Input onChange={(e) => this.tradeHandler(e, 'price')} placeholder="price" className="price" />
        <Input onChange={(e) => this.tradeHandler(e, 'amount')} placeholder="amount" className="amount" />
        <Button onClick={() => this.transactionHandler('Buy')}>Buy</Button>
        &nbsp;&nbsp;
        <Button onClick={() => this.transactionHandler('Sell')}>Sell</Button>
      </Col>
    ); 

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
      </Row>
      </div>
    );
  }
}

export default Admin;

ReactDom.render(<Admin />, document.getElementById('app'))
