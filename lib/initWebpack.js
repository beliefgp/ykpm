'use strict';

const path = require('path');
const glob = require('glob');
const webpack = require('webpack');
const extractTextPlugin = require('extract-text-webpack-plugin');
const commonsPlugin = webpack.optimize.CommonsChunkPlugin;//抽取公共文件插件
const uglifyJsPlugin = webpack.optimize.UglifyJsPlugin;//压缩插件
const progressPlugin = webpack.ProgressPlugin;
const utils = require('./utils');
const normalizePlugin = require('./NormalizePlugin');

const defaultOption = {
	buildPath: './build',
	filesPath: './src',
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
	return webpack(webpackOption);
};

function initWebpackConfig(cwd, opts) {
	let cssFix = 'css';
	let userOpt = opts.option;

	if (userOpt.cssAutoprefixer === false) { //css3自动添加兼容前缀
		cssFix = `${cssFix}!postcss`;
	}
	let cssLoader = `style!${cssFix}`;
	let lessLoader = `style!${cssFix}!less`;
	let extractPlugin;
	if (!opts.debug && userOpt.cssExtract) { //开启css打包成单独文件
		cssLoader = extractTextPlugin.extract('style', cssFix);
		lessLoader = extractTextPlugin.extract('style', `${cssFix}!less`);
		extractPlugin = new extractTextPlugin('[name].css', {
			disable: false,
			allChunks: false
		});
	}

	let fileLoader = `name=[path][name]_[sha512:hash:base64:7].[ext]&context=${opts.filesPath}`;
	if (userOpt.fileLimit) { //开启文件base64压缩，阈值内生成base64位二进制数据
		fileLoader = `url?limit=${userOpt.fileLimit}&${fileLoader}`;
	} else {
		fileLoader = `file?${fileLoader}`;
	}

	if (!opts.publicPath.endsWith(path.sep)) {
		opts.publicPath = `${opts.publicPath}${path.sep}`;
	}

	let defaultConfig = {
		entry: {},//获取项目入口js文件
		output: {
			path: path.join(cwd, opts.buildPath), //文件输出目录
			filename: '[name].js', //根据入口文件输出的对应多个文件名
			publicPath: opts.debug ? '' : opts.publicPath //生产环境路径
		},
		resolve: {
			extensions: ['', '.js', '.jsx'],
			//配置别名，在项目中可缩减引用路径
			root: path.join(cwd, opts.filesPath),
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
							utils.moduleResolvePath('babel-preset-react'),
							utils.moduleResolvePath('babel-preset-es2015')
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
			new webpack.optimize.OccurenceOrderPlugin(),
			new progressPlugin(function (percentage, msg) {
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

	if (opts.global) {//添加全局引用，无需require
		defaultConfig.plugins.push(new webpack.ProvidePlugin(opts.global));
	}

	let commonJs;
	let commonChunkJs = [];
	opts.files = opts.files.map(function (file) {
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

		if (ident == 'common') {
			commonJs = utils.getFileKey(fileKey);
		} else if (ident !== false) {
			commonChunkJs.push(utils.getFileKey(fileKey));
		}

		return fileName;
	});

	if (commonJs) {
		defaultConfig.plugins.push(new commonsPlugin({
			name: commonJs,
			chunks: commonChunkJs,
			minChunks: Infinity
		}));
	}

	if (opts.lib) {
		let libName = opts.libFileName || 'lib.js';
		let libChunks = opts.lib.map(function (file) {
			return opts.alias[file] || file;
		});

		opts.files.push({ 'ykpm_lib.js': libChunks });
		defaultConfig.plugins.push(new commonsPlugin({
			name: 'ykpm_lib',
			filename: libName,
			minChunks: userOpt.commonExtractToLib ? 0 : Infinity
		}));
	}

	defaultConfig.entry = mapFile(opts.files, cwd, opts.filesPath, defaultConfig.output.path);

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
		defaultConfig.plugins.push(new normalizePlugin());
		defaultConfig.plugins.push(new webpack.optimize.DedupePlugin());
		extractPlugin && defaultConfig.plugins.push(extractPlugin);
		userOpt.jsUglify === false || defaultConfig.plugins.push(new uglifyJsPlugin({ compress: { warnings: false } }));//js文件的压缩
	}

	return defaultConfig;
}


function mapFile(files, cwd, filespath, buildpath) {
	let list = {};
	let filePath = path.join(cwd, filespath);
	[].concat(files).forEach(function (file) {
		if (typeof file === 'string') {
			//获取路径下所有文件
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
	} else if (['.css', '.less', '.sass', '.scss'].indexOf(extname) >= 0) {
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