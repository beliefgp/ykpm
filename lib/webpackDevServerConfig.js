require('colors');
const url = require('url');
const fs = require('fs');
const { join } = require('path');
const Module = require('module');
const mock = require('mockjs');
const wildcard = require('wildcard-named');

const defaultConfig = {
	contentBase: './static/',
	https: false,
	host: 'localhost',
	port: 8080,
	hot: true,
	inline: true,
	stats: { colors: true },
	features: ['headers', 'proxy', 'setup', 'middleware', 'contentBaseFiles']
};

module.exports = function webpackDevSererConfig(option, root) {
	let config = Object.assign({}, defaultConfig);

	if (option.hostname) {
		config.host = option.hostname;
	}

	if (option.port) {
		config.port = option.port;
	}

	// 添加解析过滤器
	if (option.proxyFilter) {
		Object.keys(option.proxyFilter).forEach(function (key) {
			wildcard.addFilter(key, option.proxyFilter[key]);
		});
	}

	let proxyMap = proxyToMap(option.proxy);

	// 代理配置
	config.proxy = createProxyConfig(config, proxyMap);

	// ajax代理增加请求处理
	config.setup = createAjax(proxyMap.ajaxProxy, root);

	return config;
}

/**
 * 代理路径转换
 */
function proxyToMap(proxy) {
	let fileProxy = {};
	let ajaxProxy = {};

	Object.keys(proxy).forEach(key => {
		let itemList = [].concat(proxy[key]);
		let sourceUrl = url.parse(key);

		itemList.forEach(item => {
			let targetUrl = sourceUrl.host;
			let proxyPath = sourceUrl.path;

			if (item.path) { // 完整path拼接
				proxyPath = `${proxyPath}/${item.path}`.replace(/\/+/g, '/');
			}

			if (item.target) { // 代理文件
				let proxyItem = fileProxy[targetUrl];
				if (!proxyItem) {
					proxyItem = fileProxy[targetUrl] = {};
				}

				proxyItem[proxyPath] = {
					target: item.target
				};
			}

			if (item.data) { // ajax代理
				let proxyItem = ajaxProxy[targetUrl];
				if (!proxyItem) {
					proxyItem = ajaxProxy[targetUrl] = {};
				}

				proxyItem[proxyPath] = {
					target: proxyPath,
					mock: item.data,
					jsonpName: item.jsonpName || 'jsonpcallback'
				};
			}
		});
	});

	return { fileProxy, ajaxProxy };
}

function createProxyConfig({ https, host, port }, { fileProxy, ajaxProxy }) {
	return [{
		logProvider: () => ({
			log: () => { },
			debug: () => { },
			info: () => { },
			warn: () => { },
			error: () => { }
		}),
		ignorePath: true,
		target: url.format({
			protocol: https ? 'https:' : 'http:',
			hostname: host,
			port: port
		}),
		context(pathname, {_parsedUrl: reqUrl }) { // 本地web服务链接不代理
			return reqUrl.hostname !== null && reqUrl.hostname !== host && reqUrl.port !== port;
		},
		router(req) {
			return req.url;
		},
		bypass({ url, _parsedUrl: reqUrl, query }, res) {
			let target;

			// 文件代理
			let proxyItem = fileProxy[reqUrl.host];
			if (proxyItem) {
				if (!(target = proxyItem[reqUrl.pathname])) { // 直接匹配失败，按通配符逻辑匹配
					Object.keys(proxyItem).some(proxyPath => {
						var params = wildcard(reqUrl.pathname, proxyPath);
						if (params) {
							let targetStr = proxyItem[proxyPath].target;
							Object.keys(params).forEach(key => {
								targetStr = targetStr.replace(`[${key}]`, params[key]);
							});
							target = targetStr;
							return true;
						}
					});
				}
			}

			// 文件代理未匹配到，检查ajax代理
			if (!target && (proxyItem = ajaxProxy[reqUrl.host])) {
				target = (proxyItem[reqUrl.pathname] || {}).target;
			}

			// 执行代理
			if (target) {
				console.log(`[proxy] ${url}\r\n        ↓ ↓ ↓ ↓ ↓\r\n        ${target}`.green);
				return target.startsWith('/') ? target : `/${target}`;
			}
		}
	}];
}

function createAjax(ajaxProxy, root) {
	return function (app) {
		Object.keys(ajaxProxy).forEach(host => {
			let item = ajaxProxy[host];

			Object.keys(item).forEach(path => {
				let method = item[path];
				let ajaxPath = method.target;
				if (!ajaxPath) {
					return;
				}

				if (!ajaxPath.startsWith('/')) {
					ajaxPath = `/${ajaxPath}`;
				}

				app.all(ajaxPath, (req, res) => {
					res.app.set('jsonp callback name', method.jsonpName);

					let data = method.mock;
					if (typeof data === 'string') {
						let filePath = join(root, data);
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
			});
		});
	};
}
