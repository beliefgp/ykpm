'use strict';

var fs = require('fs');
var optimist = require('optimist');

// 帮助信息
optimist.usage([
	'Usage: ykpm [COMMAND] --config=[CONFIG_FILE]\n\n',
	'ykpm build\n',
	'ykpm [filename]\n',
	'ykpm build [filename]\n',
	'ykpm debug'
].join(''));

var argv = optimist.argv;

// 帮助信息
if (argv.help || argv.h) {
	optimist.showHelp();
	process.exit();
}

// 版本信息
if (argv.version || argv.v) {
	var packageInfo = JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf-8'));
	console.log(packageInfo.version);
	process.exit();
}

// 获取命令及参数
var [cmd, ...args] = optimist.argv._;

if (['build', 'debug', 'init', 'install', 'uninstall'].indexOf(cmd) < 0) {
	cmd && args.unshift(cmd);
	cmd = 'build';
}

var Task = require(__dirname + '/lib/' + cmd);

Task.run(process.cwd(), args, argv);
