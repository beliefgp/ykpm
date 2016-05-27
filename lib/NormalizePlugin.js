var path = require('path');

function NormalizePlugin(options) {
	this.opts = options;
}

NormalizePlugin.prototype.apply = function (compiler) {

	var opt = this.opts;

	compiler.plugin('compile', function (params) {

	});

	compiler.plugin('compilation', function (compilation) {


		compilation.plugin('optimize', function () {

		});
	});

	compiler.plugin('emit', function (compilation, callback) {
		compilation.assets = compilation.assets || {};

		//重置css文件前缀名称,删除临时文件
		for (var file in compilation.assets || {}) {
			if (file.indexOf('_webpackcssentry_') !== 0)
				continue;

			var extname = path.extname(file);
			if (extname === '.js')
				delete compilation.assets[file];
			if (extname === '.css') {
				var cssPath = file.replace('_webpackcssentry_', '');
				compilation.assets[cssPath] = compilation.assets[file];
				delete compilation.assets[file];
			}
		}
		callback && callback();
	});

	compiler.plugin('done', function (stats) {
		if (opt.debug != true) {
			process.nextTick(function () {
				console.log(stats.toString({ colors: true }));
			});
		}
		require('fs-extra').removeSync(path.join(stats.compilation.outputOptions.path, '/webpackcssentryTmp/'));
	});
};

module.exports = NormalizePlugin;