let path = require('path');
let crypto = require('crypto');

function NormalizePlugin(options) {
	this.opts = options;
}

NormalizePlugin.prototype.apply = function (compiler) {

	compiler.plugin('compilation', function (compilation) {

		// 重置module.id,rawRequest、resource单一可能重复，故采用双字段做加密key
		compilation.plugin('before-module-ids', function (modules, callback) {
			modules.forEach(function (module) {
				if (module.resource && module.id !== 0) {
					var md5 = crypto.createHash('md5');
					md5.update(`${module.rawRequest}==>${module.resource}`, 'utf8');
					module.id = md5.digest('hex');
				}
			});
			callback && callback();
		});

		// chunk.id
		compilation.plugin('before-chunk-ids', function (chunks, callback) {
			chunks.forEach(function (chunk) {
				if (chunk.name) {
					chunk.id = chunk.name;
					chunk.ids = [chunk.id];
				}
			});
			callback && callback();
		});

	});

	compiler.plugin('emit', function (compilation, callback) {
		compilation.assets = compilation.assets || {};

		// 重置css文件前缀名称,删除临时文件
		for (var file in compilation.assets || {}) {
			if (file.indexOf('_webpackcssentry_') !== 0) {
				continue;
			}

			var extname = path.extname(file);
			if (extname === '.js') {
				delete compilation.assets[file];
			}
			if (extname === '.css') {
				var cssPath = file.replace('_webpackcssentry_', '');
				compilation.assets[cssPath] = compilation.assets[file];
				delete compilation.assets[file];
			}
		}
		callback && callback();
	});

	compiler.plugin('done', function (stats) {
		process.nextTick(function () {
			console.log(stats.toString({ colors: true }));
		});

		require('fs-extra').removeSync(path.join(stats.compilation.outputOptions.path, '/webpackcssentryTmp/'));
	});
};

module.exports = NormalizePlugin;
