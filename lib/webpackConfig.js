'use strict';

require('colors');
const webpackMerge = require('webpack-merge');
const { NamedModulesPlugin, LoaderOptionsPlugin, NoEmitOnErrorsPlugin, optimize, HotModuleReplacementPlugin, ProgressPlugin, ProvidePlugin, DefinePlugin, DllPlugin, DllReferencePlugin } = require('webpack');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const { resolve } = require('path');
const { fileToEntry } = require('./utils');

// webpack默认配置
const defaultConfig = {
	// profile: true,										// 打包过程性能监测
	target: 'web',											// 应用环境
	context: __dirname,										// 根路径
	entry: {},												// 入口文件
	output: {												// 输出配置
		path: '/',											// 文件输出路径
		publicPath: '',										// 生成文件中，相对路径文件的路径前缀
		filename: '[name].js',								// 生成文件名称
		pathinfo: false,									// 文件信息(debug时用)
		chunkFilename: '[name].js'							// for long term caching
		// library: '[name]_[chunkhash]'
	},
	module: {												// 模块打包配置
		rules: [],
		noParse: /\s/										// 不做转换的模块
	},
	resolve: {
		modules: [], 										// 模块路径(可缩减引用路径)
		extensions: [										// 自动添加的后缀名
			'.js', '.json'
		],
		alias: {}, 											// alias关键字
		mainFiles: ['index'],								// 入口文件名称(当入口是目录时)
		descriptionFiles: ['package.json']					// 项目描述配置文件
		/* mainFields: ['browser', 'module', 'main']		/* import模块时，根据【项目描述配置文件】中指定的字段加载
															 * 如：import * from D3
															 * 配置文件中：
															 * D3: {
															 *	 moudule: index,
															 *   main: lib/d3.js
															 * }
															 * 将首先使用index文件
															*/
	},
	resolveLoader: {
		moduleExtensions: ['-loader']						// loader模块后缀
	},
	plugins: [												// 插件
		new NamedModulesPlugin(),
		new ProgressPlugin({ profile: false })
	],
	externals: [],											// 外部组件引用
	cache: true												// 缓存
};

// loader默认配置
const defaultLoaders = [
	{
		test: /.js?$/,
		// exclude: /node_modules/,
		use: [
			{ loader: 'babel' }
		]
	},
	{
		test: /\.(png|jpe?g|gif)$/,
		use: [
			{
				loader: 'url',
				options: {
					name: '[path][name]_[sha512:hash:base64:7].[ext]'
				}
			}
		]
	},
	{
		test: /\.(woff|woff2|ttf|eot|svg)/,
		use: [
			{
				loader: 'url',
				options: {
					name: '[path][name]_[sha512:hash:base64:7].[ext]',
					prefix: 'font/'
				}
			}
		]
	},
	{
		test: /\.css$/,
		loader: ExtractTextPlugin.extract({
			fallbackLoader: 'style',
			loader: ['css', 'postcss']
		})
	},
	{
		test: /\.less$/,
		loader: ExtractTextPlugin.extract({
			fallbackLoader: 'style',
			loader: ['css', 'postcss', 'less']
		})
	},
	{
		test: /\.scss$/,
		loader: ExtractTextPlugin.extract({
			fallbackLoader: 'style',
			loader: ['css', 'postcss', 'sass']
		})
	},
	{
		test: /\.tpl$/,
		loader: 'raw'
	}
];

// loaderOption默认配置
const defaultLoaderOption = {
	context: __dirname,									// 指定文件根目录：loader用
	url: {   											// url-loader
		dataUrlLimit: 0.1								// 不压缩(单位B，小于0.1B的才进行压缩，接近于不压缩)
	},
	babel: {											// babel-loader
		presets: [
			require('babel-preset-es2015').buildPreset({ 'loose': true, 'modules': false })
		],
		plugins: [
			// ['transform-runtime']
		]
	},
	postcss: [											// postcss-loader
		autoprefixer({
			browsers: [
				'last 3 version',
				'ie >= 10'
			]
		})
	]
};

module.exports = function webpackConfig(option, root) {

	let {loaders: userLoaders, pluginOption, loaderOption} = option;

	// loader配置校验
	userLoaders = userLoaders.filter(loader => {
		if (loader.test instanceof RegExp) {
			return true;
		}

		if (typeof loader.test === 'string') {
			loader.test = new RegExp(loader.test);
			return true;
		}

		console.warn(`Loader Not Load: then test can not convert to regexp,test: ${loader.test}`.red);

		return false;
	});

	let filesResolvePath = resolve(root, option.filesPath);

	// 入口文件转换
	let [entryMap, commonPlugins] = parseFiles(filesResolvePath, option.files, option.alias, option.selectedFiles);

	// loader配置
	let loaderConfig = webpackMerge.smart({}, { rules: defaultLoaders }, { rules: userLoaders });

	// 	loaderOption配置
	let tempLoaderOption = {
		context: filesResolvePath  // loaderOption根路径（某些loader需要，例如urlloader生成图片等文件的路径
	};
	// css3自动补齐前缀，默认开启
	if (pluginOption.cssAutoPrefixer !== false) {
		tempLoaderOption.postcss = [];
	}

	// 文件转为base64，默认关闭
	if (pluginOption.fileToBase64Limit !== false) {
		tempLoaderOption.url = {
			dataUrlLimit: pluginOption.fileToBase64Limit
		};
	}

	let config = webpackMerge({}, defaultConfig, {
		context: root,
		entry: entryMap,
		output: {
			path: option.buildPath,
			publicPath: option.publicPath
		},
		resolve: {
			alias: option.alias,
			modules: [
				filesResolvePath,
				'node_modules'
				// resolve(root, 'node_modules')
			]
		},
		externals: option.external,
		module: loaderConfig,
		plugins: [
			...commonPlugins,
			// css抽离插件
			new ExtractTextPlugin({
				filename: '[name].css',
				disable: option.debug || pluginOption.cssExtract === false,
				allChunks: true
			}),

			// 全局变量配置插件，无需require
			new ProvidePlugin(option.global || {}),

			// Loader统一配置
			new LoaderOptionsPlugin({
				minimize: pluginOption.jsUglify !== false,	 		// css压缩
				debug: option.debug,
				options: Object.assign(defaultLoaderOption, tempLoaderOption, loaderOption)
			})

			// new DllPlugin({
			// 	context: root,
			// 	path: 'ykpm.manifest.json',
			// 	name: '[name]_[chunkhash]'
			// }),

			// new DllReferencePlugin({
			// 	context: outputResolvePath,
			// 	manifest: 'manifest.json'
			// })
		],
		devtool: option.debug ? 'cheap-module-source-map' : false
	});

	// debug环境切换
	if (!option.debug) {
		config.plugins = [
			...config.plugins,
			new NoEmitOnErrorsPlugin(),
			new DefinePlugin({
				'process.env': {
					'NODE_ENV': JSON.stringify('production')
				}
			}),
			{
				apply(compiler) {
					compiler.plugin('compilation', compilation => {
						compilation.plugin('before-chunk-ids', (chunks, callback) => {
							chunks.forEach(function (chunk) {
								if (chunk.name) {
									chunk.id = chunk.name.replace(/[\/\\]/g, '_');
									chunk.ids = [chunk.id];
								}
							});
							callback && callback();
						});
					});
				}
			}
		];

		if (pluginOption.jsUglify !== false) {
			config.plugins.push(new optimize.UglifyJsPlugin({
				compress: {
					// screw_ie8: true,
					warnings: false
				},
				comments: false
			}));
		}

	} else {
		config.output.path = '/';
		config.output.publicPath = '/';
		config.plugins.push(new HotModuleReplacementPlugin());

		// 注入devserver调试地址
		Object.keys(config.entry).forEach(fileKey => {
			config.entry[fileKey] = option.devClient.concat(config.entry[fileKey]);
		});
	}

	return config;
};

/**
 * 解析入口文件配置
 * ["entry.js",{ "lib": false, "common": false, "global": true }]
 * lib 基础库
 * common 公共组件库(可能某些业务需要)
 * global 全局组件，无视lib等配置，不抽离公共组件
 */
function parseFiles(root, files, alias, selectedFiles) {
	let entry = {};
	let libChunk;
	let commonChunk;
	let selectedChunks = [];

	[].concat(files).forEach(file => {
		if (!Array.isArray(file)) {
			file = [file];
		}

		if (file.length === 0) {
			return;
		}
		let [filePath, option = {}] = file;

		let curEntry = fileToEntry(root, filePath, alias);

		let [curEntryName] = Object.keys(curEntry);

		if (!libChunk && option.lib) {
			libChunk = curEntryName;
		}

		if (!commonChunk && option.common) {
			commonChunk = curEntryName;
		}

		// 如果在cli指定生成文件，则剔除其他非lib、common文件
		if (selectedFiles.length > 0 && selectedFiles.indexOf(filePath) < 0 && selectedFiles.indexOf(alias[filePath]) < 0 && !option.lib && !option.common) {
			return;
		}

		if (option.ignorCommon !== true) {
			selectedChunks.push(curEntryName);
		}

		Object.assign(entry, curEntry);
	});

	let commonPlugins = [];

	if (libChunk) {
		commonPlugins.push(new optimize.CommonsChunkPlugin({
			names: libChunk,
			chunks: selectedChunks,
			// 抽取所有公共module，默认关闭
			minChunks: Infinity
		}));
	}

	if (commonChunk) {
		commonPlugins.push(new optimize.CommonsChunkPlugin({
			names: commonChunk,
			chunks: selectedChunks.filter(chunk => chunk !== libChunk),
			// 抽取所有公共module，默认关闭
			minChunks: Infinity
		}));
	}

	return [entry, commonPlugins];
}


// [ {"js/lib": [ "jquery", "lib/test.min.js" ]}, { "lib": true }],
// [ {"js/g": [ "js/g/top.js" ]}, { "common": true }],
// "js/play/live.js",