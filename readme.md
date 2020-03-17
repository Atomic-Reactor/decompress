# @atomic-reactor/decompress [![Build Status](https://api.travis-ci.org/Atomic-Reactor/decompress.svg?branch=master)](https://github.com/Atomic-Reactor/decompress.git)

Fork of [decompress](https://travis-ci.org/kevva/decompress) to prevent [Zip Slip](https://www.npmjs.com/advisories/1217). This
prevents this problem by filtering out any files that resolve to a parent path.

> Extracting archives made easy

*See [decompress-cli](https://github.com/kevva/decompress-cli) for the command-line version.*

## Install

```
$ npm install @atomic-reactor/decompress
```


## Usage

```js
const decompress = require('@atomic-reactor/decompress');

decompress('unicorn.zip', 'dist').then(files => {
	console.log('done!');
});
```


## API

### decompress(input, [output], [options])

Returns a Promise for an array of files in the following format:

```js
{
	data: Buffer,
	mode: Number,
	mtime: String,
	path: String,
	type: String
}
```

#### input

Type: `string` `Buffer`

File to decompress.

#### output

Type: `string`

Output directory.

#### options

##### filter

Type: `Function`

Filter out files before extracting. E.g:

```js
decompress('unicorn.zip', 'dist', {
	filter: file => path.extname(file.path) !== '.exe'
}).then(files => {
	console.log('done!');
});
```

*Note that in the current implementation, **`filter` is only applied after fully reading all files from the archive in memory**. Do not rely on this option to limit the amount of memory used by `decompress` to the size of the files included by `filter`. `decompress` will read the entire compressed file into memory regardless.*

##### map

Type: `Function`

Map files before extracting: E.g:

```js
decompress('unicorn.zip', 'dist', {
	map: file => {
		file.path = `unicorn-${file.path}`;
		return file;
	}
}).then(files => {
	console.log('done!');
});
```

##### plugins

Type: `Array`<br>
Default: `[decompressTar(), decompressTarbz2(), decompressTargz(), decompressUnzip()]`

Array of [plugins](https://www.npmjs.com/browse/keyword/decompressplugin) to use.

##### strip

Type: `number`<br>
Default: `0`

Remove leading directory components from extracted files.


## License

MIT © [Kevin Mårtensson](https://github.com/kevva)
