'use strict';
const path = require('path');
const fs = require('graceful-fs');
const decompressTar = require('decompress-tar');
const decompressTarbz2 = require('decompress-tarbz2');
const decompressTargz = require('decompress-targz');
const decompressUnzip = require('decompress-unzip');
const makeDir = require('make-dir');
const pify = require('pify');
const stripDirs = require('strip-dirs');

const fsP = pify(fs);

const runPlugins = (input, options) => {
	if (options.plugins.length === 0) {
		return Promise.resolve([]);
	}

	return Promise.all(options.plugins.map(x => x(input, options))).then(files => files.reduce((a, b) => a.concat(b)));
};

const parentRelative = filePath => /^\.{2}/.test(filePath);

const notCurrentDir = ({path}) => !['.', './', '.' + path.sep].includes(path);

/**
 * Addresses https://www.npmjs.com/advisories/1217
 * Resolve relative path to target and prevent parent relative paths.
 */
const isSafePath = file => {
	const target = path.resolve('./');

	if (parentRelative(path.relative(
		target,
		path.resolve(target, file.path)
	))) {
		return false;
	}

	if (file.linkname) {
		const resolvedRelativeLink = path.relative(
			target,
			path.resolve(target, file.linkname)
		);

		if (parentRelative(resolvedRelativeLink)) {
			return false;
		}
	}

	return true;
};

const extractFile = (input, output, options) => runPlugins(input, options).then(files => {
	files = files.filter(isSafePath).filter(notCurrentDir);

	if (options.strip > 0) {
		files = files
			.map(x => {
				x.path = stripDirs(x.path, options.strip);
				return x;
			})
			.filter(notCurrentDir);
	}

	if (typeof options.filter === 'function') {
		files = files.filter(options.filter);
	}

	if (typeof options.map === 'function') {
		files = files.map(options.map);
	}

	if (!output) {
		return files;
	}

	return Promise.all(files.map(x => {
		const dest = path.join(output, x.path);
		const mode = x.mode & ~process.umask();

		const now = new Date();

		if (x.type === 'directory') {
			return makeDir(dest)
				.then(() => fsP.utimes(dest, now, x.mtime))
				.then(() => x);
		}

		return makeDir(path.dirname(dest))
			.then(() => {
				if (options.followSymlinks !== true && fs.realpathSync(path.dirname(dest)) !== path.dirname(dest)) {
					return Promise.reject(new Error('symlinks not permitted'));
				}

				if (x.type === 'link') {
					return fsP.link(x.linkname, dest);
				}

				if (x.type === 'symlink' && process.platform === 'win32') {
					return fsP.link(x.linkname, dest);
				}

				if (x.type === 'symlink') {
					return fsP.symlink(x.linkname, dest);
				}

				return fsP.writeFile(dest, x.data, {mode});
			})
			.then(() => x.type === 'file' && fsP.utimes(dest, now, x.mtime))
			.then(() => x);
	}));
});

module.exports = (input, output, options) => {
	if (typeof input !== 'string' && !Buffer.isBuffer(input)) {
		return Promise.reject(new TypeError('Input file required'));
	}

	if (typeof output === 'object') {
		options = output;
		output = null;
	}

	options = Object.assign({plugins: [
		decompressTar(),
		decompressTarbz2(),
		decompressTargz(),
		decompressUnzip()
	]}, options);

	const read = typeof input === 'string' ? fsP.readFile(input) : Promise.resolve(input);

	return read.then(buf => extractFile(buf, output, options));
};
