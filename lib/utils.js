'use strict';

var path = require('path');

exports.moduleResolvePath = function (moduleName) {
	let filePath;
	try {
		filePath = require.resolve(moduleName);
	} catch (e) {

	}

	if (!filePath) {
		return path.join(__dirname, '../node_modules/', moduleName);
	}

	moduleName = moduleName.replace(/^\.{0,2}\//, '').replace(/\/$/, '').replace(/\//g, path.sep);

	filePath = filePath.substring(0, filePath.indexOf(moduleName) + moduleName.length);

	return path.normalize(filePath);
};

exports.getFileKey = function (filePath, extname) {
	extname = extname || path.extname(filePath);
	return filePath.replace(new RegExp(extname + '$'), '');
};
