'use strict';

var webpack = require('./initWebpack');

module.exports = {
	run: (cwd, config) => {
		var compiler = webpack(cwd, config.build);
		compiler.run(err => {
			if (err) console.error('error', err);
		});
	}
};
