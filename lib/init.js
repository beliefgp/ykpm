
let fs = require('fs');
let path = require('path');

let streamOut = process.stdout;
let streamIn = process.stdin;

module.exports = {
	run: function () {
		let index = 0;
		streamIn.setEncoding('utf-8');
		streamIn.on('data', chunk => {
			process.stdin.pause();
			prompt[index].handle(chunk.replace(/\r?\n/g, '').trim(), () => nextPrompt(++index));
		});

		function nextPrompt(curIndex) {
			streamOut.write(`${prompt[curIndex].msg}: `);
			streamIn.resume();
		}

		nextPrompt(0);
	}
};

let prompt = [
	{
		msg: 'use default config (yes)',
		handle: function (data, next) {
			if (data !== 'yes') {
				next();
				return;
			}
			writePackage(ykpm);
		}
	},
	{
		msg: 'buildPath (构建存储目录)',
		field: 'build.buildPath',
		handle: defaultHandle
	},
	{
		msg: 'filesPath (源文件目录)',
		field: 'build.filesPath',
		handle: defaultHandle
	},
	{
		msg: 'publicPath (线上映射地址)',
		field: 'build.publicPath',
		handle: defaultHandle
	},
	{
		msg: 'extract css (css文件单独打包)',
		field: 'build.option.cssExtract',
		handle: defaultHandle,
		verify: 'true'
	},
	{
		msg: 'save the package (yes)',
		handle: function (data, next) {
			if (data === 'yes') {
				writePackage(ykpm);
			}

			process.exit(1);
		}
	}
];

let ykpm = {
	'build': {
		'buildPath': '',
		'filesPath': '',
		'publicPath': '',
		'option': {
			'cssExtract': false,
			'cssAutoprefixer': true,
			'fileLimit': false,
			'jsUglify': true,
			'commonExtractToLib': false
		},
		'external': {},
		'alias': {},
		'global': {},
		'libFileName': '',
		'lib': [],
		'files': []
	},
	'debug': {
		'contentBase': './static/',
		'hostname': 'localhost',
		'port': 8080,
		'hot': true,
		'proxyFilter': {},
		'proxy': {}
	}
};

function defaultHandle(data, next) {
	this.field.split('.').reduce((prev, cur, index, array) => {
		if (index === array.length - 1) {
			prev[cur] = this.verify !== undefined ? data === this.verify : data;
		}
		return prev[cur];
	}, ykpm);

	next();
}

function writePackage(ykpmConfig) {
	let configPath = path.resolve('./package.json');
	let config = {};
	if (fs.existsSync(configPath)) {
		config = JSON.parse(fs.readFileSync(configPath), 'utf-8');
	}

	config.ykpm = ykpmConfig;

	fs.writeFileSync(configPath, JSON.stringify(config, null, 4) + '\n', { encoding: 'utf8' });
}
