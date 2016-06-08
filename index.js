'use strict';

var fs = require('fs');
var path = require('path');
var optimist = require('optimist');

var argv = optimist.argv;

//获取命令及参数
var [cmd, ...args] = optimist.argv._;

if (['build', 'debug'].indexOf(cmd) < 0) {
	cmd && args.unshift(cmd);
	cmd = 'build';
}

var config = null;
var configPath = path.resolve(argv.config || './package.json');

if (fs.existsSync(configPath)) {
	config = JSON.parse(fs.readFileSync(configPath), 'utf-8');
}

if (config === null) {
	process.exit();
}

if (cmd === 'build' && args.length > 0) {
	config.ykpm.build.shell_files = args;
}

var Task = require(__dirname + '/lib/' + cmd);

Task.run(process.cwd(), config.ykpm || {});