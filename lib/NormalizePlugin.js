let path = require('path');
let crypto = require('crypto');

function NormalizePlugin(options) {
	this.opts = options;
}

NormalizePlugin.prototype.apply = function (compiler) {

	let opts = this.opts;
	let dirname = path.join(__dirname, '..');

	compiler.plugin('compilation', compilation => {

		// 重置module.id,已文件路径和loader做唯一标识：文件、loader一致，理论来讲生成的内容必定一样(vue一个文件会生成3个模块)
		compilation.plugin('before-module-ids', (modules, callback) => {

			modules.forEach(function (module) {
				if (module.resource && module.id !== 0) {
					let md5 = crypto.createHash('md5');
					let relativePath = path.relative(opts.cwd, module.resource).replace(path.sep, '/');
					let relativeLoader = module.loaders.map(loader => loader.replace(dirname, '').replace(opts.cwd, '')).join().replace(path.sep, '/');

					md5.update(`${relativePath}${relativeLoader}`, 'utf8');
					module.id = md5.digest('hex');

					// console.log('\n', module.resource, '=======>', path.relative(opts.cwd, module.resource));
				}
			});
			callback && callback();
		});

		// chunk.id
		compilation.plugin('before-chunk-ids', (chunks, callback) => {
			chunks.forEach(function (chunk) {
				if (chunk.name) {
					chunk.id = chunk.name;
					chunk.ids = [chunk.id];
				}
			});
			callback && callback();
		});

	});

	let hasCssentryTmp = false;
	compiler.plugin('emit', (compilation, callback) => {
		compilation.assets = compilation.assets || {};

		// 重置css文件前缀名称,删除临时文件
		for (var file in compilation.assets || {}) {
			if (file.indexOf('_webpackcssentry_') !== 0) {
				continue;
			}

			hasCssentryTmp = true;

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

	compiler.plugin('done', stats => {
		if (hasCssentryTmp) {
			require('fs-extra').removeSync(path.join(stats.compilation.outputOptions.path, '/webpackcssentryTmp/'));
		}
	});
};

module.exports = NormalizePlugin;
