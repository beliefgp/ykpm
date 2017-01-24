'use strict';

const webpack = require('webpack');
const webpackConfig = require('./webpackConfig');

module.exports = {
	run: ({ build: compilerOptions = {}, root = process.cwd() }, files = []) => {
		compilerOptions.selectedFiles = files;

		let compiler = webpack(webpackConfig(compilerOptions, root));

		compiler.run((err, stats) => {
			if (err) {
				console.error('error', err);
				return;
			}

			console.log(stats.toString({ colors: true, cached: false }));
		});
	}
};
