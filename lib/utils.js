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

	moduleName = moduleName.replace(/^\.{0,2}\//, '').replace(/\/$/, '').replace('/', '\\/');

	filePath = filePath.replace(new RegExp(`^(.*?\/${moduleName})\/?.*`), '$1');

	return path.normalize(filePath);
};

exports.getFileKey = function (filePath, extname) {
	extname = extname || path.extname(filePath);
	return filePath.replace(new RegExp(extname + '$'), '');
};
