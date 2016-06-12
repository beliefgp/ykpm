'use strict';

var webpack = require('./initWebpack');

module.exports = {
	run: function (cwd, config) {
		var compiler = webpack(cwd, config.build);
		compiler.run(function (err) {
			if (err) console.error('error', err);
		});
	}
};
