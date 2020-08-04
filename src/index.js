// imba-snowpack written 2020 by eulores and released under MIT license

const fs = require('fs');
const fse = require('fs-extra');
const {fdir} = require('fdir');
const tmp = require('tmp');
const path = require('upath'); // compatible with Windows idiosyncrasies
const sm = require('source-map')
const convert = require('convert-source-map')
const imbac = require('imba/dist/compiler.js');
const {buildSync} = require('esbuild')

let ifDef = (maybeUndef, other) => (maybeUndef===undefined)?other:maybeUndef;

function unlinkRmParent(filename) {
  try {
    fs.unlinkSync(filename);
  } catch {};
  do {
    const filename = path.dirname(filename);
    if (fs.readdirSync(filename).length) return;
    fs.rmdirSync(filename);
  } while(true);
}

async function prependCode(srcCode, prefix, srcMap={}) {
  try {
    // console.log("srcMap", srcMap);
    const dstFile = srcMap.file;
    const sourceMap = await new sm.SourceMapConsumer(srcMap);
    const node = sm.SourceNode.fromStringWithSourceMap(srcCode, sourceMap);
    sourceMap.destroy();
    node.prepend(prefix);
    let {code: dstCode, map: dstMap} = node.toStringWithSourceMap({ file: dstFile });
    dstCode = convert.removeComments(dstCode);
    dstCode = convert.removeMapFileComments(dstCode);
    dstCode = dstCode + "\n" + convert.fromObject(dstMap).toComment();
    // console.log("dstMap", convert.fromJSON(dstMap.toString()).toObject());
    return dstCode;
  } catch(e) {
    console.log("Error patching source map:", e);
    return prefix + srcCode; // if anything fails, ignore sourceMap but continue prepending the code
  }
}

// new plugin format supported by snowpack 2.7.0 onwards
const plugin = function(snowpackConfig, pluginOptions) {
  const imbaHelper = "imba/dist/imba.js";
  let entrypoints = pluginOptions.entrypoints;
  if (typeof entrypoints === 'string') entrypoints = [entrypoints];
  if (!entrypoints) {
    console.log('Error: Missing script entrypoints!');
    console.log('Add one or multiple entrypoints to the snowpack configuration:');
    console.log('  "plugins": [ ["./plugin/imba-snowpack", {"entrypoints":["main.imba"]}] ]');
    return;
  }
  pluginOptions.entrypoints = entrypoints.map((entry) => path.changeExt(path.basename(entry), 'js'));
  return {
    name: 'imba-snowpack',
    resolve: {
      input: ['.imba', '.imba2'],
      output: ['.js'],
    },
    knownEntrypoints: [imbaHelper],

    async load({filePath, fileExt, isDev}) {
      const options = {
        standalone: true,
        sourceMap: ifDef(snowpackConfig.installOptions.sourceMap, true),
        evaling: true,
        target: 'web',
        format: 'esm',
        es6: true
      };
      options.sourceRoot = '';
      Object.assign(options, pluginOptions);
      filePath = path.relative(process.cwd(), filePath);
      options.filename = path.basename(filePath);
      options.sourcePath = filePath;
      options.targetPath = options.sourcePath.replace(/\.imba\d?$/,'.js');
      const helperPath = path.join(snowpackConfig.buildOptions.webModulesUrl, imbaHelper);
      const helper = `import '${helperPath}';\n`;
      const source = fs.readFileSync(filePath, 'utf-8');
      const result = imbac.compile(source, options);
      let {js, sourcemap} = imbac.compile(source, options);
      delete sourcemap.maps; // debugging leftover?
      js = await prependCode(js, helper, sourcemap);
      return { '.js': js }
    }, // end function load

    async optimize({ buildDirectory }) {
      if (snowpackConfig.devOptions.bundle) {
        const fileList = new fdir()
          .withBasePath()
          .crawl(buildDirectory)
          .sync();

        const entrypoints = fileList.filter(
          (filePath) => pluginOptions.entrypoints.some(
            (suffix) => filePath.endsWith(suffix)
          )
        );
        // console.log(entrypoints);

        // console.log('Snowpack config:', snowpackConfig);
        tmp.setGracefulCleanup();
        const {name: tmpDir, removeCallback} = tmp.dirSync({prefix: 'esbuild_', unsafeCleanup: true});
        const metaFile = path.join(tmpDir, 'meta.json');
        const q = (x) => x&&(x+':')||''
        const esbuildMsg = (type, text, loc) => (loc&&(q(loc.file)+q(loc.line)+q(loc.column)+' ')||'') + `esbuild bundler ${type}: ${text}`;
        let result = false;
        try {
          let result = buildSync({
            // entryPoints: ['./build/static/app-root.js'],
            entryPoints: entrypoints,
            metafile: metaFile,
            outdir: tmpDir,
            bundle: true,
            splitting: ifDef(pluginOptions.splitting, false),
            platform: 'browser',
            format: 'esm',
            target: ifDef(pluginOptions.target, 'es2017'),
            strict: false,
            sourcemap: false,
            minify: ifDef(pluginOptions.minify, snowpackConfig.buildOptions.minify),
            color: true,
            logLevel: 'silent'
          });
        } catch(e) {
          for (const {loc, text} of e.errors||[]) console.log(esbuildMsg('error', text, loc));
          for (const {loc, text} of e.warnings||[]) console.log(esbuildMsg('warning', text, loc));
          return;
        }
        for (const {loc, text} of result.warnings||[]) console.log(esbuildMsg('warning', text, loc));
        const meta = JSON.parse(fs.readFileSync(metaFile, { encoding: 'utf-8' }));
        // console.log(meta);
        let lookup = {};
        let lookupMove = {};
        for (const k of Object.keys(meta.inputs)) {
          let short = path.basename(k);
          lookup[short] = k;
        }
        for (const k of Object.keys(meta.outputs)) {
          let short = path.basename(k);
          lookupMove[k] = lookup[short] || path.join(buildDirectory, short);
        }
        for (const k of Object.keys(meta.inputs)) {
          unlinkRmParent(k);
        }
        unlinkRmParent(path.join(snowpackConfig.devOptions.out, snowpackConfig.buildOptions.webModulesUrl, 'import-map.json'));
        unlinkRmParent(path.join(snowpackConfig.devOptions.out, snowpackConfig.buildOptions.metaDir, 'env.js'));
        for (const [k, v] of Object.entries(lookupMove)) {
          try {
            fse.moveSync(k, v, {overwrite: true}); // creates dst directories if needed
          } catch(e) {
            console.log("Error moving files out of temp directory:", e);
          }
        }
        removeCallback(); // cleanup and delete temp directory
        snowpackConfig.buildOptions.minify = false; // not anymore required after this step!
      }
    } // end function optimize

  }
}

export default plugin;
