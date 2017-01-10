var path = require('path');

var webpack = require('webpack');

module.exports = {
  entry: './components/index.jsx',
  output: {
    path: path.resolve(__dirname, 'public/scripts'),
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      {
        test: /.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: ['es2015', 'react']
        }
      }
    ]
  },
  resolveLoader: {
    root: [
      path.join(__dirname, 'node_modules'),
    ],
  },
  resolve: {
    root: [
      path.join(__dirname, 'node_modules'),
    ],
  },
  devtool: '#inline-source-map'
  // plugins: [
  //   new webpack.DefinePlugin({  // <-- Key to reducing React's size
  //     'process.env': {
  //       'NODE_ENV': JSON.stringify('production')
  //     }
  //   }),
  //   new webpack.optimize.DedupePlugin(),            // Dedupe similar code 
  //   new webpack.optimize.UglifyJsPlugin(),          // Minify everything
  //   new webpack.optimize.AggressiveMergingPlugin()  // Merge chunks 
  // ]
};
