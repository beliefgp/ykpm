'use strict';

require('colors');
const url = require('url');
const fs = require('fs');
const join = require('path').join;
const Module = require('module');
const mock = require('mockjs');
const WebpackDevServer = require('webpack-dev-server');
const wildcard = require('wildcard-named');

const defaultOption = {
	contentBase: './static/',
	protocol: 'http',
	hostname: 'localhost',
	port: 8080,
	hot: true,
	inline: true,
	stats: { colors: true },
	features: ['headers', 'proxy', 'setup', 'middleware', 'contentBase']
};

module.exports = function initWebpackDevServer(compiler, options) {
	let webpackServerOption = initWebpackServerConfig(Object.assign({}, defaultOption, options));
	return new WebpackDevServer(compiler, webpackServerOption);

};

function initWebpackServerConfig(opts) {

	normalizeProxyConfig(opts);

	initProxy(opts);

	opts.setup = initMock(opts.ajaxProxy, opts.cwd);

	return opts;
}

function normalizeProxyConfig(opts) {
	// 添加代理过滤器
	if (opts.proxyFilter) {
		Object.keys(opts.proxyFilter).forEach(function (key) {
			wildcard.addFilter(key, opts.proxyFilter[key]);
		});
	}

	opts.fileProxy = {};
	opts.ajaxProxy = {};

	let proxyObj = opts.proxy || {};

	Object.keys(proxyObj).forEach(key => {
		let itemList = [].concat(proxyObj[key]);
		let urlObj = url.parse(key);

		itemList.forEach(item => {
			let targetUrl = urlObj.host;

			if (item.target) { // 代理文件
				let pathKey = urlObj.path;
				if (item.path) {
					pathKey = `${pathKey}/${item.path}`.replace(/\/+/g, '/');
				}

				let proxyItem = opts.fileProxy[targetUrl];
				if (!proxyItem) {
					proxyItem = opts.fileProxy[targetUrl] = {};
				}

				proxyItem[pathKey] = {
					target: item.target
				};
			}

			if (item.data) { // ajax代理
				let pathKey = urlObj.path;
				if (item.path) {
					pathKey = `${pathKey}/${item.path}`.replace(/\/+/g, '/');
				}

				let proxyItem = opts.ajaxProxy[targetUrl];
				if (!proxyItem) {
					proxyItem = opts.ajaxProxy[targetUrl] = {};
				}

				proxyItem[pathKey] = {
					target: pathKey,
					mock: item.data,
					jsonpName: item.jsonpName || 'jsonpcallback'
				};
			}
		});
	});

	return opts;
}

function initProxy(proxyConfig) {
	proxyConfig.proxy = [{
		logProvider: () => ({
			log: () => { },
			debug: () => { },
			info: () => { },
			warn: () => { },
			error: () => { }
		}),
		ignorePath: true,
		target: url.format({
			protocol: proxyConfig.protocol,
			hostname: proxyConfig.hostname,
			port: proxyConfig.port
		}),
		context: (pathname, req) => { // 本地web服务链接不代理
			let curUrl = req._parsedUrl;
			return curUrl.hostname !== null && curUrl.hostname !== proxyConfig.hostname && curUrl.port !== proxyConfig.port;
		},
		router: req => req.url,
		bypass: (req, res) => {
			let curUrl = req._parsedUrl;
			let target;

			// 文件代理
			let proxyItem = proxyConfig.fileProxy[curUrl.host];
			if (proxyItem) {
				if (!(target = proxyItem[curUrl.pathname])) { // 直接匹配失败，按通配符逻辑匹配
					Object.keys(proxyItem).some(pathKey => {
						var params = wildcard(curUrl.pathname, pathKey);
						if (params) {
							let targetStr = proxyItem[pathKey].target;
							Object.keys(params).forEach(key => {
								targetStr = targetStr.replace(`[${key}]`, params[key]);
							});
							target = targetStr;
							return true;
						}
					});
				}
			}

			// ajax代理
			if (!target && (proxyItem = proxyConfig.ajaxProxy[curUrl.host])) { // 文件代理未匹配到，检查ajax代理
				target = (proxyItem[curUrl.pathname] || {}).target;
			}

			target = target ? (console.log(`[proxy] ${req.url}\r\n        ↓ ↓ ↓ ↓ ↓\r\n        ${target}`.green) || url.parse(target)) : curUrl;

			if (!target.hostname || target.hostname === proxyConfig.hostname) {
				let path = target.path;

				target = url.format({
					protocol: null,
					hostname: null,
					port: null,
					pathname: path.startsWith('/') ? path : `/${path}`,
					query: req.query
				});
			}

			// 不代理
			return url.format(target);
		}
	}];
}

function initMock(proxyConfig, cwd) {
	return function (app) {
		Object.keys(proxyConfig).forEach(host => {
			let item = proxyConfig[host];

			Object.keys(item).forEach(path => {
				let method = item[path];
				let ajaxPath = method.target;
				if (ajaxPath) {
					if (!ajaxPath.startsWith('/')) {
						ajaxPath = `/${ajaxPath}`;
					}

					app.all(ajaxPath, (req, res) => {
						res.app.set('jsonp callback name', method.jsonpName);

						let data = method.mock;
						if (typeof data === 'string') {
							let filePath = join(cwd, data);
							if (fs.existsSync(filePath)) {
								try {
									let fileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
									let m = new Module();
									m.Mock = mock;
									m._compile(fileContent, data);
									fileContent = m.exports;
									m = null;
									if (!fileContent || !fileContent.data) {
										console.error(`[proxy-ajax] not found function [data] in mock file:${data}`.red);
										data = undefined;
									} else {
										data = fileContent.data;
									}
								} catch (e) {
									console.error(`[proxy-ajax] ${filePath} module compile error:${e.stack}`.red);
								}
							}
						}

						if (typeof data === 'function') {
							data = data(req, res);
						}

						if (data !== undefined) {
							res[req.query[method.jsonpName] ? 'jsonp' : 'json'](mock.mock(data)).end();
						}
					});
				}
			});
		});
	};
}
