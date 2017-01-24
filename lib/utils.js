'use strict';

const glob = require('glob');
const { extname, normalize, sep } = require('path');

function fileToEntry(root, sourceFiles, aliasFiles) {
	let entryMap = {};
	[].concat(sourceFiles).forEach(files => {
		// 字符串，允许通配符配置
		if (typeof files === 'string') {
			Object.assign(entryMap, filePathToFileMap(root, aliasFiles[files] || files));
		}

		if (isPlainObject(files)) {
			Object.keys(files).forEach(fileKey => {
				entryMap[filePathToKey(fileKey)] = [].concat(files[fileKey]).reduce((prevSet, curPath) => {
					return prevSet.concat(filePathToFileSet(root, aliasFiles[curPath] || curPath));
				}, []);
			});
		}
	});
	return entryMap;
}


function moduleResolvePath(moduleName) {
	let filePath;
	try {
		filePath = require.resolve(moduleName);
	} catch (e) { }

	if (!filePath) {
		return moduleName;
	}

	moduleName = moduleName.replace(/^\.{0,2}\//, '').replace(/\/$/, '').replace(/\//g, sep);

	filePath = filePath.substring(0, filePath.indexOf(moduleName) + moduleName.length);

	return normalize(filePath);
}

function filePathToKey(filePath) {
	return filePath.replace(new RegExp(`${extname(filePath)}\$`), '');
}

function isPlainObject(value) {
	return !!value && Object.prototype.toString.call(value) === '[object Object]';
}

function filePathToFileMap(root, filePath) {
	let map = {};
	let fileList = glob.sync(filePath, { cwd: root, nodir: true }) || [];

	fileList.forEach(file => {
		map[filePathToKey(file)] = [file];
	});

	return map;
}

function filePathToFileSet(root, filePath) {
	let fileMap = filePathToFileMap(root, filePath);

	return Object.keys(fileMap).reduce((fileSet, fileKey) => fileSet.concat(fileMap[fileKey]), []);
}

module.exports = { fileToEntry, moduleResolvePath, filePathToKey, isPlainObject };
