import React, {Component} from 'react';
import ReactDom from 'react-dom';
// const url = '192.241.227.176'; // Need to change to production IP/URL when deploying
const url = 'localhost';
const client = require('deepstream.io-client-js')(`${url}:6020`);

const auth = process.env.NODE_ENV === 'prod' ? {
  role: process.env.DEEPSTREAM_AUTH_ROLE,
  username: process.env.DEEPSTREAM_AUTH_USERNAME,
  password: process.env.DEEPSTREAM_AUTH_PASSWORD } : {};

class Admin extends Component {
  

  render() {
    return (
      <div>
        
      </div>
    );
  }
}

export default Admin;

ReactDom.render( document.getElementById('app'))