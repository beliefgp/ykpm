'use strict';

var moduleResolvePath = require('./utils').moduleResolvePath;
var webpack = require('./initWebpack');
var webpackServer = require('./initWebpackDevServer');

module.exports = {
	run: function (cwd, config) {

		var serverConfig = config.debug = config.debug || {};

		serverConfig.cwd = cwd;
		if (!serverConfig.hostname) {
			serverConfig.hostname = 'localhost';
		}

		if (!serverConfig.port) {
			serverConfig.port = 8080;
		}

		var devClient = [`${moduleResolvePath('webpack-dev-server/client')}?http://${serverConfig.hostname}:${serverConfig.port}`];
		if (serverConfig.hot) {
			devClient.push(moduleResolvePath('webpack/hot/dev-server'));
		}

		var webpackConfig = Object.assign(config.build || {}, { debug: true, devClient: devClient });
		webpackConfig.option = webpackConfig.option || {};
		webpackConfig.option.cssExtract = false;

		var compiler = webpack(cwd, webpackConfig);
		var server = webpackServer(compiler, serverConfig);

		server.listen(serverConfig.port, serverConfig.hostname);
	}
};
