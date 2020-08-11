# imba-snowpack

Use the [Imba compiler](https://v2.imba.io/) (v2) to build all your `*.imba` files from source using [snowpack](https://www.snowpack.dev/).

## Install

```sh
# npm:
npm install --save-dev imba-snowpack
# yarn:
yarn --dev add imba-snowpack
```

## Usage

Edit `snowpack.config.json` to add the `imba-snowpack` plugin. Remove any other bundling plugins from snowpack, such as `webpack` or `parcel`, they are not needed.

```js
{
  "plugins": ["imba-snowpack"]
},
```

### Add NPM Packages
If you need to install any NPM packages, add the name to the install script in the `package.json` file. Then run `npm install` or `yarn` once again.

```js
"install": [
  "cowsay"
],
```

## Quick start

### Create a sample directory and download the plugin

```sh
mkdir sample
cd sample
yarn init
yarn --dev add imba-snowpack
```

### Create a minimal snowpack configuration file

#### ./snowpack.config.json
```js
{
  "mount": {
    "src": "/static",
    "public": "/"
  },
  "plugins": ["imba-snowpack"],
  "devOptions": {
    "open": "default",
    "bundle": true
  }
}
```

### Create some source files

#### ./public/index.html
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Imba project</title>
</head>
<body>
    <script type="module" src="/static/app-root.js"></script>
</body>
</html>
```

#### ./src/app-root.imba
```html
// use TABS to indent the code. Check how you save the source in your editor!
tag app-root
    def render
        <self>
            <h1> "It works!"

imba.mount <app-root>
```

### Start developing your application.

`npx snowpack dev`

Any time you modify the sources, the application will reload in the web browser (active and instant hmr).


### Ready to publish?

Once ready to build for publishing on a web server, execute:

`npx snowpack build`

Copy the contents of `./build` to your web server, or launch a local web server pointing to `./build`.

### Or time to study?

Edit `snowpack.config.json`
- set `sourceMap` to `true` inside `installOptions`
- set `bundle` to `false` inside `devOptions`

```js
{
  "mount": {
    "src": "/static",
    "public": "/"
  },
  "plugins": ["imba-snowpack"],
  "installOptions": {
    "sourceMap": true
  },
  "devOptions": {
    "open": "default",
    "bundle": false
  }
}
```

Launch `npx snowpack build`

Inspect the amazing Imba code transformation by uploading the generated `.js` files to the [sourcemap visualizer](https://sokra.github.io/source-map-visualization/).

## Reference

### Relevant snowpack options

Full details on all configuration options available at the [snowpack website](https://www.snowpack.dev/#all-config-options).

#### mount

`mount` maps all your source directories to corresponding destination directories (found under `./build`).

Development of source files takes place in the source directories only.

Assets placed in source directories will be copied as is to destination directories.

```js
"mount": {
  "source directory": "destination directory"
}
```

#### plugins

All `imba-snowpack` plugin parameters are optional.

- `entrypoints` defines scripts loaded from html and forming the main entry points to your imba code. Can be `.imba` or `.js`. Only the script name is relevant, path and extension are ignored.
- `smartscan` scans the `<script>` tags of all html files to find imba or javascript entrypoints.
- `target` specifies intended browser capabilities support. Check [esbuild](https://github.com/evanw/esbuild#javascript-syntax-support) for additional details.
- `splitting` enables code splitting during production builds. This has not been tested.
- `minify` does code minification during production builds.
- `debug` adds debug logs.

Any additional `imba-snowpack` plugin parameters are passed directly to the [Imba compiler](https://github.com/imba/imba/tree/master/src/compiler).

```js
"plugins": [
  [
    "imba-snowpack",
    {
      "entrypoints": ["main script for subproject 1", "main script for subproject 2"],
      "smartscan": true,
      "target": "es2017",
      "splitting": false,
      "minify": true,
      "debug": false
    }
  ]
]
```

#### installOptions

Setting `sourceMap` to `true` only has an effect during development (`snowpack dev`), or in production (`snowpack build`) once `bundle` is set to `false`.

```js
"installOptions": {
  "sourceMap": true
}
```

#### devOptions

`snowpack dev` sets up a local development web server. To launch a web browser, specify its name in `open`, otherwise set `open` to `false`.

Setting `bundle` to `false` skips the last bundling step. Useful to inspect the compiled `.js` files or to test run the modules comprising the application. If `sourceMap` is enabled, then the `.js` files are mapped to the `.imba` sources.

```js
"devOptions": {
  "open": "default",
  "bundle": true
}
```

#### buildOptions

Javascript code minification, if enabled, only happens during bundling for production.

```js
"buildOptions": {
  "minify": true
}
```
