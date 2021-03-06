'use strict';

const path = require('path');
const glob = require('glob');
const Webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CommonsPlugin = Webpack.optimize.CommonsChunkPlugin; // 抽取公共文件插件
const UglifyJsPlugin = Webpack.optimize.UglifyJsPlugin; // 压缩插件
const ProgressPlugin = Webpack.ProgressPlugin;
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const NormalizePlugin = require('./NormalizePlugin');
const utils = require('./utils');

const defaultOption = {
	buildPath: './build',
	filesPath: './src',
	publicPath: '',
	library: {},
	option: {
		cssExtract: false,
		cssAutoprefixer: true,
		fileLimit: false
	},
	external: {},
	alias: {},
	global: {},
	lib: {},
	files: []
};

module.exports = function webpackCompiler(cwd, options) {
	let webpackOption = initWebpackConfig(cwd, Object.assign({}, defaultOption, options));
	return Webpack(webpackOption);
};

function initWebpackConfig(cwd, opts) {
	let userOpt = opts.option;
	let babel = opts.babel || {};
	let cssLoader = 'css';

	if (userOpt.cssAutoprefixer !== false) { // css3自动添加兼容前缀
		cssLoader = `${cssLoader}!postcss`;
	}

	let extractPlugin;
	let extractLoader = (before, loader) => [].concat(before, loader).join('!');
	if (!opts.debug && userOpt.cssExtract) { // 开启css打包成单独文件
		extractLoader = (before, loader) => ExtractTextPlugin.extract(before, loader);
		extractPlugin = new ExtractTextPlugin('[name].css', {
			disable: false,
			allChunks: false
		});
	}

	let fileLoader = `name=[path][name]_[sha512:hash:base64:7].[ext]&context=${opts.filesPath}`;
	if (userOpt.fileLimit) { // 开启文件base64压缩，阈值内生成base64位二进制数据
		fileLoader = `url?limit=${userOpt.fileLimit}&${fileLoader}`;
	} else {
		fileLoader = `file?${fileLoader}`;
	}

	if (!opts.publicPath.endsWith(path.sep)) {
		opts.publicPath = `${opts.publicPath}${path.sep}`;
	}

	let defaultConfig = {
		entry: {}, // 获取项目入口js文件
		output: {
			path: path.join(cwd, opts.buildPath), // 文件输出目录
			filename: '[name].js', // 根据入口文件输出的对应多个文件名
			publicPath: opts.debug ? '' : opts.publicPath // 生产环境路径
		},
		resolve: {
			extensions: ['', '.js', '.jsx'],
			root: path.join(cwd, opts.filesPath), // 配置别名，在项目中可缩减引用路径
			alias: opts.alias || {}
		},
		resolveLoader: {
			root: path.join(__dirname, '../node_modules'),
			fallback: path.join(__dirname, '../../../node_modules'),
			modulesDirectories: [path.join(cwd, 'node_modules')]
		},
		module: { // 各种加载器，即让各种文件格式可用require引用
			loaders: [
				{
					test: /\.jsx?$/,
					loader: 'babel'
					// ,exclude: /node_modules/
				},
				{ test: /\.css$/, loader: extractLoader('style', cssLoader) },
				{ test: /\.less$/, loader: extractLoader('style', `${cssLoader}!less`) },
				{ test: /\.(png|jpe?g|gif)$/, loader: fileLoader },
				{ test: /\.(woff|woff2|ttf|eot|svg)/, loader: `${fileLoader}&prefix=font/` },
				{ test: /\.tpl$/, loader: 'html?minimize=true' }
			]
		},
		babel: {
			presets: (babel.presets || ['babel-preset-es2015']).map(m => babelConvert(m, 'babel-preset-', cwd)),
			plugins: (babel.plugins || []).map(m => babelConvert(m, 'babel-plugin-', cwd))
		},
		postcss: function () {
			return [require('precss'), require('autoprefixer')];
		},
		externals: opts.external || {},
		plugins: [
			new Webpack.NoErrorsPlugin(),
			new Webpack.optimize.OccurenceOrderPlugin(),
			new ImageminPlugin({
				optipng: {
					optimizationLevel: 7
				},
				gifsicle: {
					optimizationLevel: 3
				},
				jpegtran: {
				},
				svgo: {
				},
				pngquant: {
					quality: '95-100'
				}
			}),
			new ProgressPlugin((percentage, msg) => {
				if (msg === 'compile') return;
				let stream = process.stderr;
				if (stream.isTTY && percentage < 0.71) {
					stream.cursorTo(0);
					stream.write(`[progress]:  ${msg}`);
					stream.clearLine(1);
				} else if (percentage === 1) {
					console.log('');
				}
			})
		]
	};

	// 添加全局引用，无需require
	if (opts.global) {
		defaultConfig.plugins.push(new Webpack.ProvidePlugin(opts.global));
	}

	// 用户自定义loader
	let userLoaders = opts.loader;
	if (userLoaders) {
		let loaders = defaultConfig.module.loaders;

		Object.keys(userLoaders).forEach(extname => {
			let matchLoader = (loaders.filter(loader => loader.test.test(extname)))[0];
			let userLoader = userLoaders[extname];

			if (!matchLoader) {
				if (['.css', '.less', '.scss'].indexOf(extname) !== -1) {
					userLoader = extractLoader('style', `${cssLoader}!${userLoader}`);
				}
				loaders.push({ test: new RegExp(`\\${extname}$`), loader: userLoader });
				return;
			}

			if (userLoader.startsWith('+')) {
				matchLoader.loader = `${matchLoader.loader}!${userLoader.replace(/^\+/, '')}`;
			} else {
				matchLoader.loader = userLoader;
			}
		});

	}

	// 公共库提取设置
	let commonJs;
	let commonChunkJs = [];
	opts.files = opts.files.map(file => {
		let fileName = file;
		let ident = true;
		if (Array.isArray(file)) {
			fileName = file[0];
			ident = file[1];
		}
		let fileKey = file;
		if (typeof fileName === 'object') {
			fileKey = Object.keys(fileName)[0];
		}

		if (ident === 'common') {
			commonJs = utils.getFileKey(fileKey);
		} else if (ident !== false) {
			commonChunkJs.push(utils.getFileKey(fileKey));
		}

		return fileName;
	});

	let shellFiles = opts.shell_files;
	if (shellFiles && shellFiles.length > 0) {
		commonChunkJs = [];
		opts.files = opts.files.filter(file => {
			if (typeof file === 'object') {
				file = Object.keys(file)[0];
			}
			let fileKey = utils.getFileKey(file);

			if (fileKey === commonJs) {
				return true;
			}

			if (shellFiles.indexOf(file) !== -1) {
				commonChunkJs.push(fileKey);
				return true;
			}

			return false;
		});
	}

	if (commonJs) {
		defaultConfig.plugins.push(new CommonsPlugin({
			name: commonJs,
			chunks: commonChunkJs,
			minChunks: Infinity
		}));
	}

	// 基础运行库设置
	if (opts.lib && opts.lib.length > 0) {
		let libName = opts.libFileName || 'lib.js';
		let libChunks = opts.lib.map(function (file) {
			return opts.alias[file] || file;
		});

		opts.files.push({ 'lib.js': libChunks });
		defaultConfig.plugins.push(new CommonsPlugin({
			name: 'lib',
			filename: libName,
			minChunks: userOpt.commonExtractToLib ? 0 : Infinity
		}));
	}

	defaultConfig.entry = mapFile(opts.files, cwd, opts.filesPath, defaultConfig.output.path);

	if (opts.debug) {
		defaultConfig.devtool = '#cheap-module-inline-source-map';
		defaultConfig.output.path = '/';
		if (typeof defaultConfig.entry === 'object' && !Array.isArray(defaultConfig.entry)) {
			Object.keys(defaultConfig.entry).forEach(key => {
				defaultConfig.entry[key] = opts.devClient.concat(defaultConfig.entry[key]);
			});
		} else {
			defaultConfig.entry = opts.devClient.concat(defaultConfig.entry);
		}

		defaultConfig.plugins.push(new Webpack.HotModuleReplacementPlugin());
	} else {
		defaultConfig.plugins.push(new NormalizePlugin({ cwd }));
		defaultConfig.plugins.push(new Webpack.optimize.DedupePlugin());
		extractPlugin && defaultConfig.plugins.push(extractPlugin);
		userOpt.jsUglify === false || defaultConfig.plugins.push(new UglifyJsPlugin({ sourceMap: false, compress: { warnings: false } }));
	}

	let libraryOpt;
	if ((libraryOpt = Object.keys(opts.library)).length > 0) {
		defaultConfig.output.library = libraryOpt[0];
		defaultConfig.output.libraryTarget = opts.library[libraryOpt[0]];
	}
	return defaultConfig;
}


function mapFile(files, cwd, filespath, buildpath) {
	let list = {};
	let filePath = path.join(cwd, filespath);
	[].concat(files).forEach(file => {
		if (typeof file === 'string') {
			// 获取路径下所有文件
			let fileList = glob.sync(file, { cwd: filePath, nodir: true }) || [];
			fileList.forEach(function (item) {
				fileConvertByType(list, item, item, filePath, buildpath);
			});
		} else if (typeof file === 'object') {
			for (let item in file) {
				let arrFile = [];
				let itemFiles = mapFile(file[item], cwd, filespath, buildpath);
				for (let f in itemFiles) {
					arrFile = arrFile.concat(itemFiles[f]);
				}
				fileConvertByType(list, item, arrFile, '', buildpath);
			}
		}
	});

	return list;
}

function fileConvertByType(list, item, files, cwd, buildpath) {
	let extname = path.extname(item);
	let key = utils.getFileKey(item, extname);

	if (['.js', '.jsx'].indexOf(extname) >= 0) {
		list[key] = formatFilesPath(files, cwd);
	} else if (['.css', '.less', '.scss'].indexOf(extname) >= 0) {
		key = `_webpackcssentry_${key}`;

		let jsTmpFile = path.join(buildpath, '/webpackcssentryTmp/', `${key}.js`);
		let content = wrapCSSRequire(formatFilesPath(files, cwd));
		require('fs-extra').outputFileSync(jsTmpFile, content, 'utf-8');
		list[key] = path.resolve(jsTmpFile);
	}
}

function formatFilesPath(files, cwd) {
	if (!Array.isArray(files)) {
		files = [files];
	}
	files = files.map(file => {
		return cwd ? path.join(cwd, file) : file;
	});
	return files;
}

function wrapCSSRequire(files) {
	if (!Array.isArray(files)) {
		files = [files];
	}
	return files.map(file => {
		return `require("${file.replace(/\\/g, '/')}");`;
	}).join('\n');
}

function babelConvert(name, prefix, cwd) {
	var moduleName = name;
	var option;

	if (Array.isArray(name)) {
		moduleName = name[0];
		option = name[1];
	}

	moduleName = moduleName.trim();

	if (!moduleName.startsWith(prefix)) {
		moduleName = path.join(cwd, 'node_modules', `${prefix}${moduleName}`);
	}

	moduleName = require(moduleName);

	return option ? [moduleName, option] : moduleName;
}
