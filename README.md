# ykpm

### 说明

基于webpack封装的打包工具，集成打包、调试(热更新)、代理功能。

### 安装
```bash
npm install ykpm
```

### 初始化配置
```bash
ykpm init             # 初始化默认配置
```

### 构建
```bash
ykpm build             # 打包config中的files中的所有入口文件

ykpm [filename]        # 此filename，需在config中的files配置，只会打包lib、common及其此文件

ykpm build [filename]
```

### 调试
```bash
ykpm debug
```

### 安装loader

在项目目录下安装所必须的loader, 如需其他请自行安装

```bash
npm install babel-core babel-loader style-loader css-loader postcss-loader url-loader file-loader
```
默认集成解析配置(loader需自行安装，可在配置中的loader中添加其他loader)：

| loader       | extname
| ------------ | ----------------------------                                   
| babel-loader | js、jsx
| url-loader   | png、jpg、gif、woff、ttf、eto、svg等     
| css-loader   | css
| less-loader  | less
| sass-loader  | scss
| tpl          | raw
|

### 配置说明

配置文件:ykpm.config.json

代理功能中，网络地址匹配支持的通配符使用[wildware-named](https://github.com/Bartozzz/wildcard-named)

#### 注意:

* 调试开启热更新（"hot": true）并且使用代理的时候，需要把本地代理域名放入浏览器不代理的地址列表中，并在hosts中将当前域名指向本地IP。
  此问题是开启代理，node中捕获的url是带有域名的，非代理情况下，是不含域名的，此问题已和webpack-dev-server作者沟通过，不知后续是否能够改动(……o(╯□╰)o)。

* 项目所需babel组件,默认集成babel-preset-es2015，如需其他，可在配置添加(会覆盖默认值)。
```js

"ykpm": {
    //打包相关配置
    "build": {
        "buildPath": "./build",     //打包文件输出目录
        "filesPath": "./src",       //开发文件目录，决定了所有组件的根路径
        "publicPath": "/dist/src/", //线上路径引用地址，也可是http地址(一般会在图片、字体打包时加入该路径)
        "library": {                //插件开发配置，key为插件变量名称，value为插件支持格式(具体可见webpack配置)
            "ykpm": "umd"
        },
        "pluginOption": {
            "cssExtract": true,           //css文件抽离单独打包，默认false
            "cssAutoprefixer": true,      //自动添加css3属性前缀，默认true
            "fileToBase64Limit": 10000    //文件压缩，小于10k的文件直接转换为base64位data数据，不在生成物理文件，默认false
            "jsUglify": true,             //js文件压缩，默认true
        },
        /**
         * loader配置(预发同LoaderOptionsPlugin)
        */
        "loaderOption": {
            "babel": {
                "plugins": [
                    "transform-runtime"
                ]
            }
        },
        /**
         * 用户自定义loader
         */
        "loader": [
            { "test": "\\.vue$", "loader": "vue" }
        ],
        /**
         * 外部组件调用,如在html直接引用react组件，不经过打包，配置此项，内部使用：import react from 'react'
         * 参考http://webpack.github.io/docs/configuration.html#externals
        */
        "external": {
            "react": 'React'
        }, 
        //引用简化,内部可使用：import react from 'react',而不用使用完整路径：import react from './js/lib/react.min.js'
        "alias": {
            "jquery": "lib/jquery.min.js"
        },
        /**
         * 全局变量,配合alias使用，key为项目中要使用的变量，value为要使用的组件，对应alias中的key
         * 内部可直接使用 $、react变量，而无需再用导入：import $ from 'jquery'
        */
        "global": {
            "$": "jquery"
        },
        /**
         * 要打包的主入口文件
         * 
         */
        "files": [
            [ {"js/lib": [ "jquery", "lib/test.min.js" ]}, { "lib": true }],    // 标识lib，包含运行库
            [ {"js/g": [ "js/g/top.js" ]}, { "common": true }],                 // 标识common，业务公共组件，依赖lib
            [ "js/no_lib.js", { "ignorCommon": true }]                          // 打包忽略lib、common设置，自带运行库
            "js/play/main.js",
        ]
    },
    
    //调试代理相关配置
    "debug": {
    	"contentBase": "./static/",     //静态文件目录，一般放置html
    	"hostname": "local.youku.com",  //本地服务域名（如果使用代理功能，需把此域名配置在浏览器不代理地址列表）
    	"port": 3333,                   //端口（如果使用代理功能，浏览器代理端口需与此配置相同）
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
             *   2. 支持文件路径（如例4），该路径需指向一个文件，并导出一个data属性(可使用module.Mock获取mock实例，调用Mock.Random等方法)
             * 		2.1 可直接返回ajax需要的值：exports.data = {a:1}，
             *      2.2 可为一个function：exports.data = function(req，res){return {a:1}};
             *          接收req，res两个http请求参数，return的值作为ajax的返回值
            */
            
            //例1
            "http://css.ykpm.com/[all:path]/[alnum:file]_[digit:version].[jscss:extname]": {
                "target": "[path]/[file].[extname]"
            },
            
            //例2
            "http://css.ykpm.com/": {
                "path": "[all:path]/[alnum:file]_[digit:version].[jscss:extname]",
                "target": "[path]/[file].[extname]"
            },
            
            //例3
            "http://css.ykpm.com/v3/dist/src/": [
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
            "http://portal.ykpm.com/liveportal/getTest1.action": {
                "data": "./src/test/mock.js"
            },
            
            //例5
            "http://portal.ykpm.com/liveportal": {
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
            "http://portal.ykpm.com/liveportal": [
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
  }

```

