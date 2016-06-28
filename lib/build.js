'use strict';

var webpack = require('./initWebpack');

module.exports = {
	run: (cwd, config) => {
		var compiler = webpack(cwd, config.build);
		compiler.run((err, stats) => {
			if (err) {
				console.error('error', err);
				return;
			}

			console.log(stats.toString({ colors: true, cached: false, cachedAssets: false }));
		});
	}
};
