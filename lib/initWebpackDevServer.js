'use strict';

require('colors');
const url = require('url');
const path = require('path');
const mock = require('mockjs');
const webpackDevServer = require('webpack-dev-server');
const wildcard = require('wildcard-named');

const defaultOption = {
	contentBase: './static/',
	protocol: 'http',
	hostname: 'localhost',
	port: 8080,
	hot: true,
	inline: true,
	stats: { colors: true }
};

module.exports = function initWebpackDevServer(compiler, options) {
	let webpackServerOption = initWebpackServerConfig(Object.assign({}, defaultOption, options));
	return new webpackDevServer(compiler, webpackServerOption);

};

function initWebpackServerConfig(opts) {
	let defaultConfig = {
		contentBase: opts.contentBase,
		hot: opts.hot,
		inline: opts.inline,
		stats: opts.stats,
		features: ['headers', 'proxy', 'setup', 'middleware', 'contentBase']
	};

	let proxyConfig = normalizeProxyConfig(opts);

	defaultConfig.proxy = initProxy(proxyConfig);

	defaultConfig.setup = initMock(proxyConfig.ajaxProxy);

	return defaultConfig;
}

function normalizeProxyConfig(opts) {
	//添加代理过滤器
	if (opts.proxyFilter) {
		Object.keys(opts.proxyFilter).forEach(function (key) {
			wildcard.addFilter(key, opts.proxyFilter[key]);
		});
	}

	let proxyConfig = {
		protocol: opts.protocol,
		hostname: opts.hostname,
		port: opts.port,
		fileProxy: {},
		ajaxProxy: {}
	};

	let proxyObj = opts.proxy || {};

	Object.keys(proxyObj).forEach(function (key) {
		let itemList = [].concat(proxyObj[key]);
		let urlObj = url.parse(key);

		itemList.forEach(function (item) {
			if (item.target) { //代理文件
				let pathKey = urlObj.path;
				if (item.path) {
					pathKey = `${pathKey}/${item.path}`.replace(/\/+/g, '/');
				}

				let proxyItem = proxyConfig.fileProxy[urlObj.host];
				if (!proxyItem) {
					proxyItem = proxyConfig.fileProxy[urlObj.host] = {};
				}

				proxyItem[pathKey] = {
					target: item.target
				};
			}

			if (item.data) { //ajax代理
				let pathKey = urlObj.path;
				if (item.action) {
					pathKey = `${pathKey}/${item.action}`.replace(/\/+/g, '/');
				}

				let proxyItem = proxyConfig.ajaxProxy[urlObj.host];
				if (!proxyItem) {
					proxyItem = proxyConfig.ajaxProxy[urlObj.host] = {};
				}

				proxyItem[pathKey] = {
					target: item.action || pathKey,
					mock: item.data,
					jsonpName: item.jsonpName || 'jsonpcallback'
				};
			}
		});
	});

	return proxyConfig;
}

function initProxy(proxyConfig) {
	return {
		'*': {
			bypass: function (req, res, proxyOptions) {
				let curUrl = req._parsedUrl;

				// 本地web服务链接
				if (curUrl.hostname == null || (curUrl.hostname == proxyConfig.hostname && curUrl.port == proxyConfig.port)) {
					return curUrl.path;
				}

				//文件代理
				let proxyOption;
				let proxyItem = proxyConfig.fileProxy[curUrl.host];
				if (proxyItem) {
					proxyOption = proxyItem[curUrl.pathname];
					if (!proxyOption) { //直接匹配失败，按通配符逻辑匹配
						Object.keys(proxyItem).some(function (pathKey) {
							var params = wildcard(curUrl.pathname, pathKey);
							if (params) {
								let targetStr = proxyItem[pathKey].target;
								Object.keys(params).forEach(function (key) {
									targetStr = targetStr.replace(`[${key}]`, params[key]);
								});
								proxyOption = Object.assign({}, proxyItem[pathKey], { target: targetStr });
								return true;
							}
						});
					}
				}

				//ajax代理
				if (!proxyOption) { //文件代理未匹配到，检查ajax代理
					proxyItem = proxyConfig.ajaxProxy[curUrl.host];
					if (proxyItem) {
						proxyOption = proxyItem[curUrl.pathname];
					}
				}

				if (proxyOption) {
					let targetObj = url.parse(proxyOption.target);

					let isLocal = !targetObj.hostname;

					Object.assign(proxyOptions, {
						ignorePath: true,
						target: url.format({
							protocol: isLocal ? proxyConfig.protocol : targetObj.protocol,
							hostname: isLocal ? proxyConfig.hostname : targetObj.hostname,
							port: isLocal ? proxyConfig.port : (targetObj.port || 80),
							pathname: targetObj.path,
							query: req.query
						})
					});

					console.log(`[proxy] ${req.url}\r\n        ↓ ↓ ↓ ↓ ↓\r\n        ${proxyOptions.target}`.green);
				} else { //不代理
					Object.assign(proxyOptions, {
						ignorePath: false,
						target: url.format({
							protocol: req.protocol,
							hostname: req.hostname,
							port: req.port || 80
						})
					});
				}
				return false;
			}
		}
	};
}

function initMock(proxyConfig) {
	return function (app) {
		Object.keys(proxyConfig).forEach(function (host) {
			let item = proxyConfig[host];

			Object.keys(item).forEach(function (path) {
				let method = item[path];
				let ajaxPath = method.target;
				if (ajaxPath) {
					if (!ajaxPath.startsWith('/')) {
						ajaxPath = `/${ajaxPath}`;
					}

					app.all(ajaxPath, function (req, res) {
						res.app.set('jsonp callback name', method.jsonpName);
						res[req.query[method.jsonpName] ? 'jsonp' : 'json'](mock.mock(method.mock)).end();
					});
				}
			});
		});
	};
}