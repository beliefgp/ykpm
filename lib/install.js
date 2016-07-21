'use strict';
const path = require('path');
const shell = require('shelljs');

module.exports = {
	run: function (cwd, args) {
		shell.cd(path.join(__dirname, '..'));

		shell.exec(`npm install ${args[0]}`);
	}
};
