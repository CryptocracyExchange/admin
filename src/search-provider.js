var SearchProvider = require( 'deepstream.io-provider-search-rethinkdb' );
 
var searchProvider = new SearchProvider({
  //optional, defaults to 'search' 
  listName: 'search',
 
  /**
   * Only use 0 or 1 for production!
 
   * 0 = logging off
   * 1 = only log connection events & errors
   * 2 = also log subscriptions and discards
   * 3 = log outgoing messages
   */
  logLevel: 3,
 
  // deepstream 
  deepstreamUrl: 'localhost:6020',
  deepstreamCredentials: { username: 'rethinkdb-search-provider' },
 
  // Instead of creating a new connection to deepstream, you can also 
  // reuse an existing one by substituting the above with 
  // deepstreamClient: myDeepstreamClient,
 
  // rethinkdb 
  rethinkdbConnectionParams: {
      host: 'localhost',
      port: 28015,
      db: 'deepstream'
  },
 
  //optional primary key, defaults to ds_id 
  // primaryKey: 'itemId',
 
  // Instead of creating a new connection to RethinkDb, you can also 
  // reuse an existing one by substituting the above with 
  // rethinkDbConnection: myRethinkDbConnection
});
 
// and start it 
searchProvider.start();
 
