'use strict';

const fs = require('fs');
const path = require('path');
const webpack = require('./initWebpack');
const webpackServer = require('./initWebpackDevServer');
const moduleResolvePath = require('./utils').moduleResolvePath;

module.exports = {
	run: (cwd, args, argv) => {

		let config = null;
		let configPath = path.join(cwd, argv.config || './package.json');

		if (fs.existsSync(configPath)) {
			config = JSON.parse(fs.readFileSync(configPath), 'utf-8');
		}

		if (config === null) {
			process.exit();
		}

		let ykpm = config.ykpm || { build: {}, debug: {} };

		let serverConfig = ykpm.debug || {};
		let webpackConfig = ykpm.build || {};

		let isListenHostname = true;
		serverConfig.cwd = cwd;
		if (!serverConfig.hostname) {
			isListenHostname = false;
			serverConfig.hostname = 'localhost';
		}

		if (!serverConfig.port) {
			serverConfig.port = 8080;
		}

		var devClient = [`${moduleResolvePath('webpack-dev-server/client')}?http://${serverConfig.hostname}:${serverConfig.port}`];
		if (serverConfig.hot) {
			devClient.push(moduleResolvePath('webpack/hot/dev-server'));
		}

		webpackConfig.debug = true;
		webpackConfig.devClient = devClient;
		webpackConfig.option = webpackConfig.option || {};
		webpackConfig.option.cssExtract = false;

		var compiler = webpack(cwd, webpackConfig);
		var server = webpackServer(compiler, serverConfig);

		server.listen(serverConfig.port, isListenHostname ? '' : serverConfig.hostname);
	}
};
