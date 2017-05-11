import React, {Component} from 'react';
import ReactDom from 'react-dom';
import _ from 'lodash';
import { Row, Input, Navbar, NavItem, Icon, Button, Badge, Col, CollectionItem, Collection } from 'react-materialize';
import request from 'superagent';
import Big from 'big.js';
import bcrypt from 'bcrypt-nodejs';

// const url = 'localhost'; // Need to change to production IP/URL when deploying
const url = '35.167.82.137';
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
      numberOfAutotrades: 0,
      numberOfMessages: 0,
      allMessages: [],
      generateMessages: true,
      clearInterval: ''
    };
    this.balanceListener();
    this.dataListener();

    const queryString = JSON.stringify({
      table: 'user',
      query: [
      ]
    });

    this.userList = client.record.getList('search?' + queryString);
    this.messageGenerator = this.messageGenerator.bind(this);
    this.messageGeneratorWrapper = this.messageGeneratorWrapper.bind(this);
    this.setMessageNumber = this.setMessageNumber.bind(this);
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
              if (!error && userData.userID !== 'demo' || userData.userID !== window.localStorage.getItem('cryptocracyuserID')) {
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
              }
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
      const pairs = {
        BTCLTC: {
          lastPrice: 0.00453114, // BTC for 1 LTC
          gMax: 0.006,
          gMin: 0.003
        },
        DOGEBTC: {
          lastPrice: 4, //4167348, // DOGE for 1 BTC
          gMax: 50,
          gMin: 3
        },
        DOGELTC: {
          lastPrice: 18, //18937, // DOGE for 1 LTC
          gMax: 20,
          gMin: 16
        }
      }

      var username;

      const generateTradeData = () => {
        const getRandomSmallInt = (min, max) => {
          min = Math.ceil(min);
          max = Math.floor(max);
          return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        const getRandomBigInt = (min, max) => {
          return Big(Math.random()).times(max.minus(min).plus(1)).plus(min);
        };

        const getRandomUser = () => {
          let userName = this.state.userNames[getRandomSmallInt(0, this.state.userNames.length - 1)];
          while(userName === 'demo' || userName === window.localStorage.getItem('cryptocracyuserID')) {
            userName = this.state.userNames[getRandomSmallInt(0, this.state.userNames.length - 1)];
          }
   
          return userName;
        }

        // randomly pick a user from the list of users in state
        const userName = getRandomUser();
        // randomly pick a 'from' currency
        const currencies = ["BTC", "LTC", "DOGE"];
        const fromCurrency = currencies.splice(getRandomSmallInt(0, currencies.length - 1), 1)[0];
        // randomly pick a 'to' currency
        const toCurrency = currencies.splice(getRandomSmallInt(0, currencies.length - 1), 1)[0];
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
        const lMax = Big(pairs[pairName].gMax)
                        .minus(Big(pairs[pairName].lastPrice))
                        .times(getRandomSmallInt(0.5, 3) / 100);
        // new lMin = (lastPrice - gMin)(random % between 10 and 25)
        const lMin = Big(pairs[pairName].lastPrice)
                        .minus(Big(pairs[pairName].gMin))
                        .times(getRandomSmallInt(0.5, 3) / 100);
        // new order price = random number between lMax and lMin
        const price = getRandomBigInt(lMin, lMax).toString();
        const amount = 1; //getRandomSmallInt(1, 10); // Could base this off of the relative price of a pair...
        const type = getRandomSmallInt(0,1) === 0 ? 'buy' : 'sell'; // This may be biased...
        return {
          price: +price,
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
        const randomTime = Math.round(Math.random() * (500)) + 500;
        const id = setTimeout(loopCallback.bind(this), randomTime);
        this.setState({autotradeTimeoutID: id});
      };

      loop();
    }
  }

  // Users
  generateUsersClickHandler(numberOfUsers) {
    request
      .get(`https://randomuser.me/api/?results=${this.state.numberOfUsers}&inc=login,email`)
      .end(function(err, res){
        if(err) { console.log(err) } else {
          console.log(res.body.results);
          res.body.results.forEach((user) => {
            client.record.getRecord(`user/${user.login.username}`).whenReady((newUserRecord) => {
              bcrypt.genSalt(10, (error, salt) => {
                bcrypt.hash(user.login.password, salt, null, (err, hashedPassword) => {
                  client.record.getRecord(`email/${user.email}`).whenReady((newEmailRecord) => {
                    newEmailRecord.set({
                      email: user.email,
                      password: hashedPassword
                    });
                    newUserRecord.set({
                      email: user.email,
                      username: user.login.username,
                      password: hashedPassword,
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
                        });
                        newUserRecord.discard();
                        newEmailRecord.discard();
                      }
                    });
                  });
                });
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

  messageGenerator() {
    var opening = ['just', '', '', '', '', 'ask me how i', 'completely', 'nearly', 'productively', 'efficiently', 'last night i', 'the president', 'that wizard', 'a ninja', 'a seedy old man', 'the market', 'totally', 'the real satoshi nakimoto'];
    var verbs = ['drank', 'drunk', 'deployed', 'got', 'developed', 'built', 'crashed', 'invented', 'experienced', 'fought off', 'hardened', 'enjoyed', 'developed', 'consumed', 'debunked', 'drugged', 'doped', 'made', 'wrote', 'saw', 'pump', 'dump', 'short', 'lost everything' ];
    var objects = ['my', 'your', 'the', 'a', 'my', 'speculators', 'an entire', 'this', 'that', 'the', 'the big', 'a new form of'];
    var nouns = ['crypto', 'the man', 'trump', 'bitcoin', 'litecoin', 'dogecoin', 'fiat currency', 'cat', 'koolaid', 'system', 'city', 'worm', 'cloud', 'trolls', 'potato', 'money', 'way of life', 'belief system', 'security system', 'bad decision', 'future', 'life', 'whales', 'mind'];
    var storeMessages = [];
    // var numberOfMessages = this.state.numberOfMessages;
    var randomElement = function(array){
      var randomIndex = Math.floor(Math.random() * array.length);
        return array[randomIndex];
      };
    var randomMessage = function(){
      return [randomElement(opening), randomElement(verbs), randomElement(objects), randomElement(nouns)].join(' ');
      };

    const getRandomSmallInt = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
      };
    let userName = this.state.userNames[getRandomSmallInt(0, this.state.userNames.length - 1)];
    while(userName === 'demo' || userName === window.localStorage.getItem('cryptocracyuserID')) {
      userName = this.state.userNames[getRandomSmallInt(0, this.state.userNames.length - 1)];
    }
    /*for (var i = 0; i < this.state.numberOfMessages; i++) {
      var newMessage = randomMessage();
      storeMessages.push(newMessage);   
    }*/
    var newMessage = randomMessage();
    // storeMessages.push(newMessage);   
    /*this.setState({
      allMessages: storeMessages
    })*/
    // console.log('newMessage is: ', newMessage);
    const time = Date.now();
    client.event.emit('trollbox-create-message', {
      userID: userName,
      content: newMessage,
      time: time
    });
    // console.log('storeMessages is: ', storeMessages);
    // console.log(this.state.allMessages);
  }

  setMessageNumber(e) {
    var numOfMessages = Number(e.target.value);
    this.setState({
      numberOfMessages: numOfMessages
    })
  }
/*<Input onChange={(e) => this.setMessageNumber(e)} placeholder="type number of messages to generate here"/>*/

  messageGeneratorWrapper() {
    this.setState({
      generateMessages: !this.state.generateMessages
    })
    console.log('this.state.generateMessages is: ', this.state.generateMessages);
    if (this.state.generateMessages) {
      let clearId = setInterval( () => this.messageGenerator(), 3000)
      this.setState({
        clearInterval: clearId
      })  
    } else {
      clearInterval(this.state.clearInterval);
    }
    
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
                )}
              )}
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
          <Button onClick={() => this.generateUsersClickHandler()}>Generate Users</Button>
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

    const trollboxMessages = (
      <Row>
        <Button onClick={this.messageGeneratorWrapper}>Toggle messages</Button>
      </Row>
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
        <Row>
          <h4>Trollbox</h4>
          {trollboxMessages}
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
