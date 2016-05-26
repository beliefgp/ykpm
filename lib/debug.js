'use strict';

var webpack = require('./initWebpack');
var webpackServer = require('./initWebpackDevServer');

module.exports = {
	run: function (cwd, config) {
		var serverConfig = config.debug = config.debug || {};

		if (!serverConfig.host) {
			serverConfig.host = 'localhost';
		}

		if (!serverConfig.port) {
			serverConfig.port = 8080;
		}

		var devClient = ['webpack-dev-server/client?http://' + serverConfig.host + ':' + serverConfig.port];
		if (serverConfig.hot) {
			devClient.push('webpack/hot/dev-server');
		}

		var webpackConfig = Object.assign(config.build || {}, { debug: true, devClient: devClient });
		webpackConfig.option = webpackConfig.option || {};
		webpackConfig.option.cssExtract = false;

		var compiler = webpack(cwd, webpackConfig);
		var server = webpackServer(compiler, serverConfig);
		server.listen(serverConfig.port, serverConfig.host);
	}


};