'use strict';

const fs = require('fs');
const path = require('path');
const optimist = require('optimist');

// 帮助信息
optimist.usage([
	'Usage: ykpm [COMMAND] --config=[CONFIG_FILE]\n\n',
	'ykpm build\n',
	'ykpm [filename]\n',
	'ykpm build [filename]\n',
	'ykpm debug'
].join(''));

const argv = optimist.argv;

// 帮助信息
if (argv.help || argv.h) {
	optimist.showHelp();
	process.exit();
}

// 版本信息
if (argv.version || argv.v) {
	let packageInfo = JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf-8'));
	console.log(packageInfo.version);
	process.exit();
}

// 获取命令及参数
let [cmd, ...args] = optimist.argv._;

if (['build', 'debug'].indexOf(cmd) < 0) {
	cmd && args.unshift(cmd);
	cmd = 'build';
}

let root = process.cwd();
let config = null;

[argv.config, './ykpm.config.js', './ykpm.config.json', './package.json'].some(configPath => {
	return fs.existsSync(configPath) && (config = require(path.resolve(root, configPath)));
});

if (config === null) {
	console.log('not found config');
	process.exit();
}

let ykpmConfig = config.ykpm || {};

ykpmConfig.root = root;

require(__dirname + `/lib/${cmd}Cmd`).run(ykpmConfig, args);
