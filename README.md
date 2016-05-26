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


```js

"ykpm": {
	//打包相关配置
    "build": {
      "buildpath": "./build", //打包文件输出目录
      "filespath": "./src", //开发文件目录，决定了所有组件的根路径
      "option": {
        "cssExtract": true, //css文件抽离单独打包，默认false
        "cssAutoprefixer": true, //自动添加css3属性前缀，默认true
        "fileLimit": 10000 //文件压缩，小于10k的文件直接转换为base64位data数据，不在生成物理文件，默认false
      },
	  //外部组件调用,如在html直接引用react组件，不经过打包，配置此项，内部使用：import react from 'react'
      "external": {
		  "react": 'React'
	  }, 
	  //引用简化,内部可使用：import react from 'react',而不用使用完整路径：import react from './js/lib/react.min.js'
      "alias": {
		  "react": 'lib/react.min.js'
	  },
      //全局变量,配合alias使用，key为项目中要使用的变量，value为要使用的组件，对应alias中的key
	  //内部可直接使用 $、react变量，而无需再用导入：import $ from 'jquery'
      "global": { 
		"$": "jquery",
		"react": "react"
      },
	  //需要单独打包出的公共组件，filename允许重置lib文件路径名称，默认在buildpath下lib.js
	  //其余为lib文件所包含的公共组件，key为alias简称，value为路径
      "lib": {
        "filename": "js/lib.js",
        "jquery": "lib/jquery.min.js"
      },
	  //要打包的主入口文件
      "files": [
        "js/live.js"
      ]
    },
	//调试代理相关配置
    "debug": {
      "contentBase": "./static/",//静态文件目录，一般放置html
      "host": "local.youku.com",//本地代理域名
      "port": 3333,//端口
      //是否开启热更新(保存修改的文件时，页面会自动刷新，无需手动)，默认true
	  //***提醒：开启热更新并且使用代理的时候，需要把本地代理域名放入浏览器不代理的地址列表中
	  "hot": true,
      "proxy": {
		//需要代理的域名，浏览器需开启代理127.0.0.1，端口同上
        "urls": [
          "css.tudou.com"
        ],
		//css、js文件名称解析格式，如页面js文件带版本号，需配置此项，例：style_1_1.css,配置(name)_*_*
		"parser": "(name)_*",
		//需要拦截的ajax方法后缀,默认只拦截无后缀的，/getInfo.action,配置.action
        "actionExtname": [".action"],
        "mock": {
		  //jsonp的回调名称，默认jsonpcallback
          "jsonpName": "jsonpcallback",
          "list": {
			//需要拦截的方法名(域名需在urls配置)，支持mockjs解析。不在此配置中的方法，会请求正确的地址
            "action/getTestInfo": {
              "data|1-10": [
                {
                  "id|+1": 1
                }
              ]
            }
          }
        }
      }
    }
  },



```

