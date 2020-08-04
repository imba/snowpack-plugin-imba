# imba-snowpack

Use the [Imba compiler](https://www.imba.io/) to build all your `*.imba` files from source using [snowpack](https://www.snowpack.dev/).

## Install

```sh
# npm:
npm install --save-dev imba-snowpack
# yarn:
yarn --dev add imba-snowpack
```

## Usage

Adapt `snowpack.config.json` with the plugin pointing to the main script.

```js
{
  "plugins": [["imba-snowpack", { "entrypoints": ["app-root"]}]]
}
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
  "plugins": [
    [
      "imba-snowpack",
      {
        "entrypoints": ["app-root"]
      }
    ]
  ],
  "installOptions": {
  },
  "devOptions": {
    "open": "default",
    "bundle": true
  },
  "buildOptions": {
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

Most `imba-snowpack` plugin parameters are optional, except for `entrypoints`.

- `entrypoints` defines scripts loaded from html and forming the main entry points to your imba code. Can be `.imba` or `.js`. Only the script name is relevant, path and extension are ignored.
- `target` specifies intended browser capabilities support. Check [esbuild](https://github.com/evanw/esbuild#javascript-syntax-support) for additional details.
- `splitting` enables code splitting during production builds. This has not been tested.
- `minify` does code minification during production builds.

Any additional `imba-snowpack` plugin parameters are passed directly to the [Imba compiler](https://github.com/imba/imba/tree/master/src/compiler).

```js
"plugins": [
  [
    "imba-snowpack",
    {
      "entrypoints": ["main script for subproject 1", "main script for subproject 2"],
      "target": "es2017",
      "splitting": false,
      "minify": true
    }
  ]
]
```

#### installOptions

Setting `sourceMap` to `true` only has an effect on the intermediate building step, visible after `snowpack build` with `bundle` set to `false`.

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
