import React, {Component} from 'react';
import ReactDom from 'react-dom';
import _ from 'lodash';
import { Row, Input, Navbar, NavItem, Icon, Button, Col, CollectionItem, Collection } from 'react-materialize';
import request from 'superagent';

// const url = '192.241.227.176'; // Need to change to production IP/URL when deploying
const url = 'localhost';
const client = window.deepstream(`${url}:6020`);

class Admin extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      options: [],
      balanceOptions: { isExternal: false },
      tradeOptions: {},
      userData: {},
      userNames: [],
      numberOfUsers: 0
    };
    this.balanceListener();
    this.dataListener();

    const queryString = JSON.stringify({
      table: 'user',
      query: [
      ]
    });

    this.userList = client.record.getList('search?' + queryString);
  }

  
  componentWillMount() {
    client.login({
      role: process.env.DEEPSTREAM_AUTH_ROLE || 'provider',
      username: process.env.DEEPSTREAM_AUTH_USERNAME || 'admin-service',
      password: process.env.DEEPSTREAM_AUTH_PASSWORD || '12345'
    });
  }
  

  componentDidMount() {
    this.userList.subscribe((userRecordNames) => {
      userRecordNames.forEach((userRecordName) => {
        if (!this.state.userData.hasOwnProperty(userRecordName)) {
          client.record.snapshot(`user/${userRecordName}`, (error, userData) => {
            client.record.snapshot(`balances/${userRecordName}`, (error, userBalances) => {
              const newUser = {};
              newUser[userRecordName] = {
                username: userData.userID,
                email: userData.email,
                BTC: {actual: userBalances.BTC.actual, available: userBalances.BTC.available},
                LTC: {actual: userBalances.LTC.actual, available: userBalances.LTC.available},
                DOGE: {actual: userBalances.DOGE.actual, available: userBalances.DOGE.available}
              };
              const change = _.extend(newUser, this.state.userData);
              this.setState({userData: change});
              this.setState({userNames: Object.keys(change)});
            })
          });
        }
      });
    }, true);
  }
  
  componentWillUnmount() {
    this.userList.discard();
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
        entDelete('openOrders')
        // entDelete('openSell');
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

  transactionHandler(type) {
    this.state.tradeOptions.type = type
    client.event.emit('transaction', this.state.tradeOptions);
  }

// getData() {
//   let options = {
//     primaryCurrency: 'BTC',
//     secondaryCurrency: 'LTC'
//   }
//   client.event.emit('getData', options);
// }

  // Users
  generateUsersClickHandler(numberOfUsers) {
    request
      .get(`https://randomuser.me/api/?results=${this.state.numberOfUsers}&inc=login,email`)
      .end(function(err, res){
        if(err) { console.log(err) } else {
          console.log(res.body.results);
          res.body.results.forEach((user) => {
            client.record.getRecord(`user/${user.login.username}`).whenReady((userRecord) => {
              userRecord.set({
                email: user.email,
                userID: user.login.username,
                password: user.login.salt + user.login.sha1,
                originalPW: user.login.password
              }, (err) => {
                if (err) {
                  console.log('Record set with error:', err)
                } else {
                  client.event.emit('initBalance', { userID: user.login.username });
                  const currencies = ["BTC", "LTC", "DOGE"];
                  currencies.forEach((currencyType) => {
                    client.event.emit('updateBalance', {
                      userID: user.login.username,
                      isExternal: true,
                      currency: currencyType,
                      update: "100000"
                    });
                  })
                }
              });
            })
          })
        }
      });
  }

  numberOfUsersToGenerateHandler(e) {
    let value = e.target.value;
    let change = _.extend({}, this.state);
    change.numberOfUsers = +value;
    this.setState(change);
  }

  render() {
    const UserList = (
      <div>
        <Collection>
          {this.state.userNames.map((userName, key) => {
            return (
            <CollectionItem key={key}>
              <Row>
                <Col>
                  {this.state.userData[userName].username}
                  <br />
                  {this.state.userData[userName].email}
                </Col>
                <Col>
                  BTC: {this.state.userData[userName].BTC.available}
                  <br />
                  LTC: {this.state.userData[userName].LTC.available}
                  <br />
                  DOGE: {this.state.userData[userName].DOGE.available}
                </Col>
              </Row>
            </CollectionItem>
            )
          })}
        </ Collection>
      </div>
    );

    const GenerateUsers = (
      <Col s={12}>
        <Input
          onChange={(e) => { this.numberOfUsersToGenerateHandler(e) }}
          label="Number of Users (max 5000)"
          s={12}
          />
        <Button onClick={() => { this.generateUsersClickHandler() }}>Generate Users</Button>
      </Col>
    );

    const listDropper = (
      <Col s={12} className=''>
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
      <Col s={4} className='balances'>
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
       <Col s={4} className='balances'>
        Buy & Sell Transactions
        <br/><br/>
        <Input onChange={(e) => this.tradeHandler(e, 'userID')} placeholder="userID" className="userID" />
        <Input onChange={(e) => this.tradeHandler(e, 'currFrom')} placeholder="currency from" className="currency" />
        <Input onChange={(e) => this.tradeHandler(e, 'currTo')} placeholder="currency to" className="currency" />
        <Input onChange={(e) => this.tradeHandler(e, 'price')} placeholder="price" className="price" />
        <Input onChange={(e) => this.tradeHandler(e, 'balanceType')} placeholder="available or actual" className="baltype" />
        <Input onChange={(e) => this.tradeHandler(e, 'amount')} placeholder="amount" className="amount" />
        <Button onClick={() => this.transactionHandler('buy')}>Buy</Button>
        &nbsp;&nbsp;
        <Button onClick={() => this.transactionHandler('sell')}>Sell</Button>
      </Col>
    );

    // const data = (
    //     <Button onClick={() => this.getData()}>Get Data!</Button>
    //     {data}
    //   )

    return (
      <div>
        <Navbar brand='devTools' />
        <br /><br />
        <Row>
          <Col s={6}>
            <h4>Users</h4>
            {GenerateUsers}
            <br />
            {UserList}
          </Col>
          <Col s={6}>
            <h4>Automated Trades</h4>

          </Col>
        </Row>
        <Row>
          <Col>
            <h4>Misc.</h4>
            {listDropper}
            {balances}
            {trades}
          </Col>
        </Row>
      </div>
    );
  }
}

export default Admin;

ReactDom.render(<Admin />, document.getElementById('app'))

if (module.hot) {
  module.hot.accept();
}