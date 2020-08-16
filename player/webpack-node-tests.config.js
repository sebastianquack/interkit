const path = require('path');

const mode = process.env.NODE_ENV || 'development';
const prod = mode === 'production';

module.exports = {
	entry: {
		bundle: ['./loadTestPostMessage.js']
	},
	resolve: {
		alias: {
			svelte: path.resolve('node_modules', 'svelte')
		},
		extensions: ['.js'],
		mainFields: ['browser', 'module', 'main']
	},
	output: {
		path: __dirname + '/node-tests-dist',
	},
	target: 'node',
	mode,
	devtool: prod ? false: 'source-map',
};
