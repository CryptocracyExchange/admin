import React, {Component} from 'react';
import ReactDom from 'react-dom';
import _ from 'lodash';
import { Row, Input, Navbar, NavItem, Icon, Button, Badge, Col, CollectionItem, Collection } from 'react-materialize';
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
      numberOfUsers: 0,
      autotradeTimeoutID: 0,
      numberOfAutotrades: 0
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
                DOGE: {actual: userBalances.DOGE.actual, available: userBalances.DOGE.available},
                trades: 0
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
    console.log(this.state.tradeOptions);
    this.state.tradeOptions.type = type
    client.event.emit('transaction', this.state.tradeOptions);
  }

  // Automated Trades

  automatedTrading () {
    if (this.state.autotradeTimeoutID !== 0) {
      clearTimeout(this.state.autotradeTimeoutID);
      this.setState({autotradeTimeoutID: 0}); 
    } else {
      // Implement big to handle these numbers...
      const pairs = {
        BTCLTC: {
          lastPrice: 0.00453114, // BTC for 1 LTC
          gMax: 0.006,
          gMin: 0.003
        },
        DOGEBTC: {
          lastPrice: 4167348, // DOGE for 1 BTC
          gMax: 5000000,
          gMin: 3000000
        },
        DOGELTC: {
          lastPrice: 18937, // DOGE for 1 LTC
          gMax: 20000,
          gMin: 16000
        }
      }

      var username;

      const generateTradeData = () => {
        const getRandom = (min, max) => {
          min = Math.ceil(min);
          max = Math.floor(max);
          return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        // randomly pick a user from the list of users in state
        const userName = this.state.userNames[getRandom(0, this.state.userNames.length - 1)];
        // randomly pick a 'from' currency
        const currencies = ["BTC", "LTC", "DOGE"];
        const fromCurrency = currencies.splice(getRandom(0, currencies.length - 1), 1)[0];
        // randomly pick a 'to' currency
        const toCurrency = currencies.splice(getRandom(0, currencies.length - 1), 1)[0];
        const pairName = ["BTCLTC", "DOGEBTC", "DOGELTC"].filter((pair) => {
          const map = {};
          if (pair[0] === 'D') {
            map.DOGE = true;
            if (pair[4] === 'B') {
              map.BTC = true;
            } else {
              map.LTC = true;
            }
          } else {
            map.BTC = true;
            map.LTC = true;
          }
          return map.hasOwnProperty(fromCurrency) && map.hasOwnProperty(toCurrency);
        })[0]; // find matching pair name for obj lookup
        // new lMax = (gMax - lastPrice)(random % between 10 and 25)
        const lMax = (pairs[pairName].gMax - pairs[pairName].lastPrice)*(getRandom(10, 25) / 100);
        // new lMin = (lastPrice - gMin)(random % between 10 and 25)
        const lMin = (pairs[pairName].lastPrice - pairs[pairName].gMin)*(getRandom(10, 25) / 100);
        // new order price = random number between lMax and lMin
        const price = getRandom(lMin, lMax);
        const amount = getRandom(1, 1000); // Could base this off of the relative price of a pair...
        const type = getRandom(0,1) === 0 ? 'buy' : 'sell'; // This may be too biased...
        return {
          price: price,
          userID: userName,
          currFrom: fromCurrency,
          currTo: toCurrency,
          amount: amount,
          type: type
        }
      }

      const loopCallback = () => {
        const tradeData = generateTradeData();
        console.log(tradeData);
        client.event.emit('transaction', tradeData);
        const change = _.extend({}, this.state);
        change.numberOfAutotrades++;
        change.userData[tradeData.userID].trades++;
        this.setState(change);
        loop();
      };

      const loop = () => {
        const randomTime = Math.round(Math.random() * (2000 - 300));
        const id = setTimeout(loopCallback.bind(this), randomTime);
        this.setState({autotradeTimeoutID: id});
      };

      loop();
    }
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
                      update: currencyType === "DOGE" ? "10000000" : currencyType === "LTC" ? "100000" : "10000"
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
      <Row>
        <Col s={12}>
          <div className='z-depth-3'>
            <Collection>
              {this.state.userNames.map((userName, key) => {
                return (
                <CollectionItem key={key}>
                  <Row>
                    <Col s={4}>
                      {this.state.userData[userName].username}
                      <br />
                      {this.state.userData[userName].email}
                    </Col>
                    <Col s={4}>
                      BTC: {this.state.userData[userName].BTC.available}
                      <br />
                      LTC: {this.state.userData[userName].LTC.available}
                      <br />
                      DOGE: {this.state.userData[userName].DOGE.available}
                    </Col>
                    <Col s={4}>
                      <Badge newIcon>Trades: {this.state.userData[userName].trades}</Badge>
                    </Col>
                  </Row>
                </CollectionItem>
                )
              })}
            </ Collection>
          </div>
        </Col>
      </Row>
    );

    const GenerateUsers = (
      <Col s={6}>
        <div className='z-depth-3'>
          <h5 className='center'>
            Generate Random Users
          </h5>
          <Input
            onChange={(e) => { this.numberOfUsersToGenerateHandler(e) }}
            label="Number of Users (max 5000)"
            s={12}
            />
          <Button onClick={() => { this.generateUsersClickHandler() }}>Generate Users</Button>
        </div>
      </Col>
    );

    const AutoTrade = (
      <Col s={6}>
        <div className='z-depth-3'>
          <h5 className='center'>
            Auto Trade
          </h5>
          <Button
            floating
            large
            waves='light'
            className={this.state.autotradeTimeoutID === 0 ? 'green' : 'red'}
            icon={this.state.autotradeTimeoutID === 0 ? 'play_arrow' : 'pause'}
            onClick={this.automatedTrading.bind(this)}
            />
          <Badge newIcon>{this.state.numberOfAutotrades}</Badge>
        </div>
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
            <h4>Users</h4>
            {GenerateUsers}
            {AutoTrade}
            <br /><br />
            {UserList}
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