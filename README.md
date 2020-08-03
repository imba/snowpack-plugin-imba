# imba/imba-snowpack

Use the [IMBA compiler](https://www.imba.io/) to build your `.imba` files from source.

```
npm install --save-dev imba/imba-snowpack
```
or
```
yarn -D add imba/imba-snowpack
```

```js
// snowpack.config.json -or- snowpack section inside package.json
{
  "plugins": [["imba/imba-snowpack", { /* see "Plugin Options" below */}]]
}
```

#### Bare bones package.json file

```js
{
  "scripts": {
    "dev": "snowpack dev",
    "build": "snowpack build"
  },
  "snowpack": {
    "mount": {
      "src": "/static",
      "public": "/"
    },
    "plugins": [
      [
        "imba/imba-snowpack",
        {
          "entrypoints": ["app-root"]
        }
      ]
    ],
    "installOptions": {
    },
    "devOptions": {
      "open": "default"
    },
    "buildOptions": {
    }
  },
  "dependencies": {
    "imba": "^2.0.0-alpha.70",
    "snowpack": "^2.7.5"
  }
}
```

Put your *.imba files into ./src and *.html and the rest into ./public.

The main script file should be named app-root.js

#### ./index.html

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

```
tag app-root
    def render
        <self>
            <h1> "It works!"

imba.mount <app-root>
```

#### Plugin Options

These options are read from the snowpack section:
- `installOptions.sourceMap`, default is true
- `buildOptions.minify`, default is true

These options are read from the embedded plugin section:
- `splitting`, default is false
- `target`, default is es2017
- `minify`, default is true

Mount source directories containing imba sources and other assets to destination paths (public, src).

Assets are copied as is, imba sources are compiled to javascript and bundled ("/", "/static").

Define one or several main imba source entry points (only script name, path and extension are ignored) in the plugin options:

```
package.json
{
  "scripts": {
    "start": "snowpack dev",
    "build": "snowpack build",
    "web": "http-server build -o --cors -c-1"
  },
  "snowpack": {
    "mount": {
      "src": "/static",
      "public": "/"
    },
    "plugins": [
      [
        "./plugin/imba-snowpack",
        {
          "entrypoints": ["app-root"]
        }
      ]
    ]
  }
}
```

Open points:

- Choose bundle name and location (config?)
- hmr does dumb page reloading, should instead reinstantiate only affected imba modules
- consolidate npm modules to lower amount of dependencies
- use cheerio to find entrypoints within HTML files
- use native log functionality and colorize output accordingly


Any extra plugin `options` are passed directly to the IMBA compiler. See [here](https://github.com/imba/imba/tree/master/src/compiler) for a list of supported options.
