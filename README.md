# ykpm

### 说明

基于webpack封装的打包工具，集成打包、调试(热更新)、代理功能，默认开启es6语法支持。

### 安装

npm install ykpm

### 使用

打包：ykpm build \[filename\]  (配置此filename，会忽略config中的files配置)

调试：ykpm debug

### 配置说明

配置文件默认寻找项目下package.json文件

代理功能中，网络地址匹配支持的通配符使用[wildware-named](https://github.com/Bartozzz/wildcard-named)

```js

"ykpm": {
	//打包相关配置
    "build": {
		"buildPath": "./build", //打包文件输出目录
		"filesPath": "./src", //开发文件目录，决定了所有组件的根路径
		"publicPath": "/dist/src/", //线上路径引用地址，也可是http地址(一般会在图片、字体打包时加入该路径)
		"option": {
			"cssExtract": true, //css文件抽离单独打包，默认false
			"cssAutoprefixer": true, //自动添加css3属性前缀，默认true
			"fileLimit": 10000 //文件压缩，小于10k的文件直接转换为base64位data数据，不在生成物理文件，默认false
			"jsUglify": true, //js文件压缩，默认true
			"commonExtractToLib": false //提取所有入口文件公共部分至lib基础库中，默认false
		},
		//外部组件调用,如在html直接引用react组件，不经过打包，配置此项，内部使用：import react from 'react'
		//参考http://webpack.github.io/docs/configuration.html#externals
		"external": {
			"react": 'React'
		}, 
		//引用简化,内部可使用：import react from 'react',而不用使用完整路径：import react from './js/lib/react.min.js'
		"alias": {
			"jquery": "lib/jquery.min.js",
			"react": 'lib/react.min.js'
		},
		//全局变量,配合alias使用，key为项目中要使用的变量，value为要使用的组件，对应alias中的key
		//内部可直接使用 $、react变量，而无需再用导入：import $ from 'jquery'
		"global": {
			"$": "jquery",
			"react": "react"
		},
		//lib文件路径名称，默认在buildpath下lib.js
		"libFileName": "js/lib.js",
		//需要单独打包出的公共基础库：1.可使用alias中简称 2.可直接使用路径(一般是模块挂载到window上的，否则会无法import到)
		"lib": [
			"jquery",
			"lib/test.min.js"
		],
		/**
		 * 要打包的主入口文件
		 * 
		 * 注意：适应某些特殊需要，类似g.js全局业务逻辑,需要标识“common”，入口文件涉及到g.js中重复module的，将不在重复打包
		 *      不涉及g.js的，需要标识false
		 */
		"files": [
			"js/live.js",

			[{"js/g.js": ["js/g/nav.js", "js/g/top.js"]}, "common"],
			["js/g.js", "common"],
			["js/no_g_page.js", false]
		]
    },
	//调试代理相关配置
    "debug": {
    	"contentBase": "./static/",//静态文件目录，一般放置html
    	"host": "local.youku.com",//本地服务域名（如果使用代理功能，需把此域名配置在浏览器不代理地址列表）
    	"port": 3333,//端口（如果使用代理功能，浏览器代理端口需与此配置相同）
    	/*
    	 * 是否开启热更新(保存修改的文件时，页面会自动刷新，无需手动)，默认true
    	 * **提醒：开启热更新并且使用代理的时候，需要把本地代理域名放入浏览器不代理的地址列表中
    	*/
		"hot": true,
    	/*
    	 * 代理通配符过滤器
    	 * 默认配置查看wildware-named
    	*/
    	"proxyFilter": {
			"jscss": "(js|css)"
		},
      	/*
       	 * 代理项配置(需要开启浏览器代理，代理到本地：127.0.0.1:3333)
		 * 同域名下，文件、接口支持混写
      	*/
		"proxy": {
			/*
			 * 代理文件
			 * 需指明本地对应路径文件target，支持通配符匹配
			 * 
			 * 
			 * 代理接口
			 * jsonpName指明jsonp回调函数传参名称，默认jsonpcallback
			 * 
			 * 需指明返回数据data：
			 *   1. 支持mockjs数据格式
			 *   2. 支持文件路径（如例4），该路径需指向一个文件，并导出一个data属性
			 * 		2.1 可直接返回ajax需要的值：exports.data = {a:1}，
			 *      2.2 可为一个function：exports.data = function(req，res){return {a:1}};
			 *          接收req，res两个http请求参数，return的值作为ajax的返回值
			*/
			
			//例1
			"http://css.tudou.com/[all:path]/[alnum:file]_[digit:version].[jscss:extname]": {
				"target": "[path]/[file].[extname]"
			},
			
			//例2
			"http://css.tudou.com/": {
				"path": "[all:path]/[alnum:file]_[digit:version].[jscss:extname]",
				"target": "[path]/[file].[extname]"
			},
			
			//例3
			"http://css.tudou.com/v3/dist/src/": [
				{
					"path": "[all:path]/[alnum:file]_[digit:version].[jscss:extname]",
					"target": "[path]/[file].[extname]"
				},
				{
					"path": "/getJsVersion.action",
					"data": {
						"data|1-10": [
							{
								"id|+1": 1
							}
						]
					}
				}
			],
			
			//例4
			"http://portal.zb.youku.com/liveportal/getTest1.action": {
				"data": "./src/test/mock.js"
			},
			
			//例5
			"http://portal.zb.youku.com/liveportal": {
				"path": "getTest2.action",
				"data": {
					"data|1-10": [
						{
							"id|+2": 2
						}
					]
				}
			},
			
			//例6
			"http://portal.zb.youku.com/liveportal": [
				{
					"jsonpName": "callback",
					"path": "getTest3",
					"data": {
						"data|1-10": [
							{
								"id|+1": 1
							}
						]
					}
				},
				{
					"jsonpName": "jsonpcallback",
					"path": "getTest4",
					"data": {
						"data|1-10": [
							{
								"id|+1": 1
							}
						]
					}
				}
			]
		}
    }
  },



```

