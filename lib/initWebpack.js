'use strict';

var path = require('path');
var glob = require('glob');
var webpack = require('webpack');
var extractTextPlugin = require('extract-text-webpack-plugin');
var commonsPlugin = webpack.optimize.CommonsChunkPlugin;//抽取公共文件插件
var uglifyJsPlugin = webpack.optimize.UglifyJsPlugin;//压缩插件
var progressPlugin = webpack.ProgressPlugin;
var moduleResolvePath = require('./utils').moduleResolvePath;
var normalizePlugin = require('./NormalizePlugin');

var defaultOption = {
	buildpath: './build',
	filespath: './src',
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
	var webpackOption = initWebpackConfig(cwd, Object.assign(defaultOption, options));
	return webpack(webpackOption);
};

function initWebpackConfig(cwd, opts) {
	var cssFix = 'css';
	var userOpt = opts.option;

	if (userOpt.cssAutoprefixer) { //css3自动添加兼容前缀
		cssFix = `${cssFix}!postcss`;
	}
	var cssLoader = `style!${cssFix}`;
	var lessLoader = `style!${cssFix}!less`;
	var extractPlugin;
	if (userOpt.cssExtract) { //开启css打包成单独文件
		cssLoader = extractTextPlugin.extract('style', cssFix);
		lessLoader = extractTextPlugin.extract('style', `${cssFix}!less`);
		extractPlugin = new extractTextPlugin('[name].css');
	}

	var fileLoader = `name=[path][name]_[sha512:hash:base64:7].[ext]&context=${opts.filespath}`;
	if (userOpt.fileLimit) { //开启文件base64压缩，阈值内生成base64位二进制数据
		fileLoader = `url?limit=${userOpt.fileLimit}&${fileLoader}`;
	} else {
		fileLoader = `file?${fileLoader}`;
	}

	var defaultConfig = {
		entry: {},//获取项目入口js文件
		output: {
			path: path.join(cwd, opts.buildpath), //文件输出目录
			filename: '[name].js' //根据入口文件输出的对应多个文件名
		},
		resolve: {
			extensions: ['', '.js', '.jsx'],
			//配置别名，在项目中可缩减引用路径
			root: path.join(cwd, opts.filespath),
			alias: opts.alias || {}
		},
		resolveLoader: {
			root: path.join(__dirname, '../node_modules'),
			fallback: path.join(__dirname, '../../../node_modules'),
			modulesDirectories: [path.join(cwd, 'node_modules')]
		},
		module: {//各种加载器，即让各种文件格式可用require引用
			loaders: [
				{
					test: /\.jsx?$/,
					loader: 'babel',
					query: {
						presets: [
							moduleResolvePath('babel-preset-react'),
							moduleResolvePath('babel-preset-es2015')
						]
					},
					exclude: /node_modules/
				},
				{ test: /\.css$/, loader: cssLoader },
				{ test: /\.less$/, loader: lessLoader },
				{ test: /\.(png|jpg|gif)$/, loader: fileLoader },
				{ test: /\.(woff|woff2|ttf|eot|svg)/, loader: `${fileLoader}&prefix=font/` }
			]
		},
		postcss: function () {
			return [require('precss'), require('autoprefixer')];
		},
		externals: opts.external || {},
		plugins: [
			new normalizePlugin({ debug: opts.debug }),
			new webpack.optimize.OccurenceOrderPlugin(),
			new webpack.optimize.DedupePlugin(),
			new progressPlugin(function (percentage, msg) {
				if (msg === 'compile') return;
				var stream = process.stderr;
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

	var libJs = opts.lib;
	if (libJs) {
		var libName = 'lib.js';
		if (libJs.filename) {
			libName = libJs.filename;
			delete libJs['filename'];
		}

		var libChunks = [];
		var libAlias = {};
		for (var name in libJs) {
			libAlias[name] = libJs[name];
			libChunks.push(libJs[name]);
			break;
		}
		opts.files.push({ 'lib.js': libChunks });
		defaultConfig.resolve.alias = Object.assign(defaultConfig.resolve.alias, libAlias);
		defaultConfig.plugins.push(new commonsPlugin('lib', libName));
	}

	if (opts.global) {//添加全局引用，无需require
		defaultConfig.plugins.push(new webpack.ProvidePlugin(opts.global));
	}

	defaultConfig.entry = mapFile(opts.files, cwd, opts.filespath, defaultConfig.output.path);

	if (opts.debug) {
		defaultConfig.devtool = '#cheap-module-inline-source-map';
		defaultConfig.output.path = '/';
		if (typeof defaultConfig.entry === 'object' && !Array.isArray(defaultConfig.entry)) {
			Object.keys(defaultConfig.entry).forEach(function (key) {
				defaultConfig.entry[key] = opts.devClient.concat(defaultConfig.entry[key]);
			});
		} else {
			defaultConfig.entry = opts.devClient.concat(defaultConfig.entry);
		}

		defaultConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
	} else {
		extractPlugin && defaultConfig.plugins.push(extractPlugin);
		defaultConfig.plugins.push(new uglifyJsPlugin({ compress: { warnings: false } }));//js文件的压缩
	}

	return defaultConfig;
}


function mapFile(files, cwd, filespath, buildpath) {
	var list = {};
	var filePath = path.join(cwd, filespath);
	[].concat(files).forEach(function (file) {
		if (typeof file === 'string') {
			//获取路径下所有文件
			var fileList = glob.sync(file, { cwd: filePath, nodir: true }) || [];
			fileList.forEach(function (item) {
				fileConvertByType(list, item, item, filePath, buildpath);
			});
		} else if (typeof file === 'object') {
			for (var item in file) {
				var arrFile = [];
				var itemFiles = mapFile(file[item], cwd, filespath, buildpath);
				for (var f in itemFiles) {
					arrFile = arrFile.concat(itemFiles[f]);
				}
				fileConvertByType(list, item, arrFile, '', buildpath);
			}
		}
	});

	return list;
}

function fileConvertByType(list, item, files, cwd, buildpath) {
	var extname = path.extname(item);
	var key = item.replace(new RegExp(extname + '$'), '');

	if (['.js', '.jsx'].indexOf(extname) >= 0) {
		list[key] = formatFilesPath(files, cwd);
	} else if (['.css', '.less', '.sass', '.scss'].indexOf(extname) >= 0) {
		key = `_webpackcssentry_${key}`;

		var jsTmpFile = path.join(buildpath, '/webpackcssentryTmp/', `${key}.js`);
		var content = wrapCSSRequire(formatFilesPath(files, cwd));
		require('fs-extra').outputFileSync(jsTmpFile, content, 'utf-8');
		list[key] = path.resolve(jsTmpFile);
	}
}

function formatFilesPath(files, cwd) {
	if (!Array.isArray(files)) {
		files = [files];
	}
	files = files.map(function (file) {
		return cwd ? path.join(cwd, file) : file;
	});
	return files;
}

function wrapCSSRequire(files) {
	if (!Array.isArray(files)) {
		files = [files];
	}
	return files.map(function (file) {
		return `require("${file.replace(/\\/g, '/')}");`;
	}).join('\n');
}