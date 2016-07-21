'use strict';

const fs = require('fs');
const path = require('path');
const webpack = require('./initWebpack');

module.exports = {
	run: (cwd, args, argv) => {

		let config = null;
		let configPath = path.join(cwd, argv.config || './package.json');

		if (fs.existsSync(configPath)) {
			config = JSON.parse(fs.readFileSync(configPath), 'utf-8');
		}

		if (config === null) {
			process.exit();
		}

		let ykpm = config.ykpm || { build: {} };

		let buildConfig = ykpm.build || {};

		buildConfig.shell_files = args;

		var compiler = webpack(cwd, buildConfig);
		compiler.run((err, stats) => {
			if (err) {
				console.error('error', err);
				return;
			}

			console.log(stats.toString({ colors: true, cached: false, cachedAssets: false }));
		});
	}
};
