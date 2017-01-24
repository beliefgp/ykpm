'use strict';

const webpack = require('webpack');
const webpackConfig = require('./webpackConfig');
const WebpackDevServer = require('webpack-dev-server');
const webpackDevServerConfig = require('./webpackDevServerConfig');

module.exports = {
	run: ({ build: compilerOptions, debug: devServerOptions, root = process.cwd() }) => {

		let devServerConfig = webpackDevServerConfig(devServerOptions, root);

		let { host, port } = devServerConfig;

		compilerOptions.devClient = [
			`${require.resolve('webpack-dev-server/client')}?http://${host}:${port}`,
			'webpack/hot/dev-server'
		];

		compilerOptions.debug = true;

		let compiler = webpack(webpackConfig(compilerOptions, root));

		let server = new WebpackDevServer(compiler, devServerConfig);

		server.listen(port, host);
	}
};
