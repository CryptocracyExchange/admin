class Addresses extends React.Component{ // eslint-disable-line
  constructor(props) {
    super(props);
    this.state = {
      userID: props.userID,
      BTCAddress: '',
      LTCAddress: '',
      DOGEAddress: '',
    };

    this.client = deepstream('localhost:6020').login(); // eslint-disable-line
    this.userWallet = this.client.record.getRecord(`wallets/${props.userID}`);
  }

  componentWillMount() {
    this.userWallet.subscribe('BTC.address', (address) => {
      this.setState({ BTCAddress: address });
    });
    this.userWallet.subscribe('LTC.address', (address) => {
      this.setState({ LTCAddress: address });
    });
    this.userWallet.subscribe('DOGE.address', (address) => {
      this.setState({ DOGEAddress: address });
    });
  }

  componentWillUnmount() {
    this.userWallet.unsubscribe();
  }

  handleGenerateWalletClick(type) {
    this.client.event.emit('wallet-create', { userID: 'userID', currency: type });
  }

  render() {
    return React.createElement('div', null, // eslint-disable-line
      React.createElement('h3', null, 'Generate Wallets'), // eslint-disable-line
      React.createElement('button', { onClick: () => this.handleGenerateWalletClick('BTC') }, 'Generate BTC Address'), // eslint-disable-line
      React.createElement('button', { onClick: () => this.handleGenerateWalletClick('LTC') }, 'Generate LTC Address'), // eslint-disable-line
      React.createElement('button', { onClick: () => this.handleGenerateWalletClick('DOGE') }, 'Generate DOGE Address'), // eslint-disable-line
      React.createElement('div', null, `BTC Address: ${this.state.BTCAddress}`), // eslint-disable-line
      React.createElement('div', null, `LTC Address: ${this.state.LTCAddress}`), // eslint-disable-line
      React.createElement('div', null, `DOGE Address: ${this.state.DOGEAddress}`) // eslint-disable-line
    );
  }
}

Addresses.propTypes = {
  userID: React.PropTypes.string.isRequired, // eslint-disable-line
};

class Transfers extends React.Component { // eslint-disable-line
  constructor(props) {
    super();
    this.state = {
      userID: props.userID,
      currency: 'BTC',
      address: '',
      amount: null,
    };
    this.handleAddressUpdate = this.handleAddressUpdate.bind(this);
    this.handleAmountUpdate = this.handleAmountUpdate.bind(this);
    this.handleCurrencyUpdate = this.handleCurrencyUpdate.bind(this);
    this.handleTransferClick = this.handleTransferClick.bind(this);
    this.client = deepstream('localhost:6020').login({username: 'walletbrowerclient'}); // eslint-disable-line
  }

  handleAddressUpdate(e) {
    this.setState({
      address: e.target.value,
    });
  }

  handleAmountUpdate(e) {
    this.setState({
      amount: e.target.value,
    });
  }

  handleCurrencyUpdate(e) {
    this.setState({
      currency: e.target.value,
    });
  }

  handleTransferClick() {
    this.client.event.emit('wallet-transfer-out', {
      userID: this.state.userID,
      currency: this.state.currency,
      amount: this.state.amount,
      address: this.state.address,
    });
  }

  render() {
    return React.createElement('div', null, // eslint-disable-line
            React.createElement('h3', null, 'Transfer Out'), // eslint-disable-line
            React.createElement('select', { name: 'Currency', onChange: this.handleCurrencyUpdate }, // eslint-disable-line
              React.createElement('option', { value: 'BTC' }, 'BTC'), // eslint-disable-line
              React.createElement('option', { value: 'LTC' }, 'LTC'), // eslint-disable-line
              React.createElement('option', { value: 'DOGE' }, 'DOGE') // eslint-disable-line
            ), // eslint-disable-line
            React.createElement('input', { // eslint-disable-line
              type: 'Text',
              value: this.state.address,
              placeholder: 'Enter your address',
              onChange: this.handleAddressUpdate,
            }, null),
            React.createElement('input', { // eslint-disable-line
              type: 'Text',
              value: this.state.amount,
              placeholder: 'Enter your amount',
              onChange: this.handleAmountUpdate,
            }, null), // eslint-disable-line
            React.createElement('button', { onClick: this.handleTransferClick }, 'Submit Transfer')); // eslint-disable-line
  }
}

Transfers.propTypes = {
  userID: React.PropTypes.string.isRequired, // eslint-disable-line
};

const App = () => (
  React.createElement('div', { userID: 'userID' }, // eslint-disable-line
  React.createElement('h1', null, 'Cryptocracy - Admin'), // eslint-disable-line
  React.createElement(Addresses, { userID: 'userID' }, null), // eslint-disable-line
  React.createElement(Transfers, { userID: 'userID' }, null)) // eslint-disable-line
);

ReactDOM.render( // eslint-disable-line
  React.createElement(App, { userID: 'userID' }, null), // eslint-disable-line
  document.getElementById('app') // eslint-disable-line
);
