'use strict';

var url = require('url');
var path = require('path');
var mock = require('mockjs');
var webpackDevServer = require('webpack-dev-server');

var defaultOption = {
	contentBase: './static/',
	host: 'localhost',
	port: 8080,
	hot: true,
	proxy: {
		urls: [],
		actionExtname: [],
		parser: '',
		mock: {
			jsonpName: 'jsonpcallback',
			list: {}
		}
	}
};



module.exports = function initWebpackDevServer(compiler, options) {
	var webpackServerOption = initWebpackServerConfig(Object.assign(defaultOption, options));
	return new webpackDevServer(compiler, webpackServerOption);

};

function initWebpackServerConfig(opts) {
	var defaultConfig = {
		contentBase: opts.contentBase,
		hot: true,
		inline: true,
		stats: { colors: true }
	};

	defaultConfig.proxy = initProxy(opts);

	if (defaultConfig.proxy) {
		defaultConfig.setup = initMock(opts.proxy);
	}

	return defaultConfig;
}


function initProxy(opts) {
	var proxyConfig = opts.proxy;
	if (!proxyConfig) {
		return null;
	}

	proxyConfig.actionExtname = [''].concat(proxyConfig.actionExtname || '');

	return {
		'*': {
			bypass: function (req, res, proxyOptions) {
				var curHost = req.hostname;
				if (curHost == opts.host) {
					return req.url;
				}

				//默认不代理
				proxyOptions.target = url.format({
					protocol: req.protocol,
					hostname: req.hostname,
					port: req.port || 80
				});

				if (proxyConfig.urls.indexOf(curHost) != -1) {
					var extname = path.extname(url.parse(req.url).pathname);

					//ajax接口,如果未设置mock代理数据，请求真实地址
					if (proxyConfig.actionExtname.indexOf(extname) != -1 && proxyConfig.mock && proxyConfig.mock.list) {
						var notProxyAction = req.path;

						for (var action in proxyConfig.mock.list) {
							if (notProxyAction == action) {
								notProxyAction = null;
								break;
							}
						}

						if (notProxyAction) {
							return false;
						}
					}

					//css、js文件修正掉版本区分后缀
					if (['.js', '.css'].indexOf(extname) != -1 && proxyConfig.parser) {
						var urlReg = new RegExp('^(.*)\\/' + proxyConfig.parser.replace(/\*+/, '\\\w*').replace('name', '\\\w*') + '(\\' + extname + ')(.*)$');
						req.url = req.url.replace(urlReg, '$1/$2$3$4');
					}

					proxyOptions.target = url.format({
						protocol: opts.protocol || 'http',
						hostname: opts.host,
						port: opts.port
					});

				}

				return false;
			}
		}
	};
}

function initMock(opts) {
	var mockConfig = opts.mock;
	if (!mockConfig) {
		return null;
	}

	return function (app) {
		app.set('jsonp callback name', mockConfig.jsonpname || 'jsonpcallback');

		var list = mockConfig.list;
		if (list) {
			for (var path in list) {
				app.all('/' + path, function (req, res) {
					var data = mock.mock(list[path]);

					res[req.query.jsonpcallback ? 'jsonp' : 'json'](data).end();
				});
			}
		}
	};

}