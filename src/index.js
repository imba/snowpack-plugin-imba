// imba-snowpack written 2020 by eulores and released under MIT license

const fs = require('fs');
const path = require('upath'); // compatible with Windows idiosyncrasies
const sm = require('source-map')
const imbac = require('imba/dist/compiler.js');
const {buildSync} = require('esbuild')
const cheerio = require('cheerio');

function debug(wp, ...args) {
  if (debug.active) console.log(`WP${wp}:`, ...args);
}

function* fetchRefs(html) {
  const $ = cheerio.load(html);
  const importRE = /import\b.*(['"])(\S+)\1[ \)]*;/g;
  const allScripts = $('script').toArray();
  for(let thisScript of allScripts) {
    if (thisScript.attribs && thisScript.attribs.src) yield thisScript.attribs.src;
    else if (thisScript.children) for (let child of thisScript.children) {
      let groups;
      const contents = child.data;
      while ((groups = importRE.exec(contents)) !== null) {
        yield(groups[2]);
      }
    }
  }
}

function walk(dir) {
  // const paths = [];
  const dirs = [dir];
  let i = 0;
  let k = 0;
  const js = {};
  const html = [];
  while (i <= k) {
    const dir = dirs[i];
    const dirents = fs.readdirSync(dir, {withFileTypes: true});
    dirents.forEach(
      function(dirent) {
        let fullPath = dir + path.sep + dirent.name;
        if (dirent.isDirectory()) {
          dirs.push(fullPath);
          k++;
        } else {
          // paths.push(fullPath);
          let lName = dirent.name.toLowerCase();
          if (lName.endsWith('.js')) {
            js[lName.slice(0, -3)] = fullPath;
          } else if (lName.endsWith('.html')) {
            html.push(fullPath);
          }
        }
      }
    );
    i++;
  }
  return {
    // paths: paths,
    js: js,
    html: html
  };
}

function unlinkRmParent(filename) {
  try {
    fs.unlinkSync(filename);
  } catch {};
  do {
    filename = path.dirname(filename);
    if (fs.readdirSync(filename).length) return;
    fs.rmdirSync(filename);
  } while(true);
}

async function prependCode(srcCode, prefix, srcMap={}) {
  try {
    const dstFile = srcMap.file;
    const sourceMap = await new sm.SourceMapConsumer(srcMap);
    const node = sm.SourceNode.fromStringWithSourceMap(srcCode, sourceMap);
    sourceMap.destroy();
    node.prepend(prefix);
    let {code: dstCode, map: dstMap} = node.toStringWithSourceMap({ file: dstFile });
    dstCode = dstCode.replace(/\/[\/*][@#]\s+sourceMappingURL=.+$/mg, '')
    dstCode = dstCode +
    '\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,' +
    Buffer.from(dstMap.toString(), 'utf8').toString('base64');
    return dstCode;
  } catch(e) {
    debug(1, "Error patching source map:", e);
    return prefix + srcCode; // if anything fails, ignore sourceMap but continue prepending the code
  }
}

// new plugin format supported by snowpack 2.7.0 onwards
const plugin = function(snowpackConfig, pluginOptions) {
  if (pluginOptions.debug==true) debug.active = true;
  const imbaHelper = "imba/dist/imba.js";
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
        sourceMap: snowpackConfig.installOptions.sourceMap ?? true,
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
      const source = fs.readFileSync(filePath, { encoding: 'utf-8'});
      // const result = imbac.compile(source, options);
      let {js, sourcemap} = imbac.compile(source, options);
      delete sourcemap.maps; // debugging leftover?
      js = await prependCode(js, helper, sourcemap);
      return { '.js': js }
    }, // end function load

    async optimize({ buildDirectory }) {
      if (snowpackConfig.devOptions.bundle) {
        debug(3, 'start optimize');
        const resultWalk = walk(path.normalizeSafe(buildDirectory));
        let entrypoints = pluginOptions.entrypoints||[];
        if (typeof entrypoints === 'string') entrypoints = [entrypoints];
        if (pluginOptions.smartscan ?? true) {
          for (let htmlFile of resultWalk.html) {
            const contents = fs.readFileSync(htmlFile, { encoding: 'utf-8'});
            for (const ref of fetchRefs(contents)) entrypoints.push(ref);
          }
        }
        entrypoints = entrypoints.map((entry) => resultWalk.js[path.trimExt(path.basename(entry)).toLowerCase()]);
        // remove empty and duplicate values
        entrypoints = [...new Set(entrypoints.filter((el)=>el))];
        if (!entrypoints) {
          console.error(`Missing script entrypoints!\n` +
            `Add one or multiple entrypoints to the snowpack configuration:\n` +
            `  "plugins": [ ["./plugin/imba-snowpack", {"entrypoints":["main.imba"]}] ]` );
          return;
        }
        debug(4, entrypoints);
        debug(5, 'Snowpack config:', snowpackConfig);
        const tmpDir = buildDirectory+'.tmp';
        debug(6, tmpDir);
        const metaFile = path.join(tmpDir, 'meta.json');
        const q = (x) => x&&(x+':')||''
        const esbuildMsg = (type, text, loc) => (loc&&(q(loc.file)+q(loc.line)+q(loc.column)+' ')||'') + `esbuild bundler ${type}: ${text}`;
        let result = false;
        try {
          debug(7, 'starting esbuild process');
          let result = buildSync({
            entryPoints: entrypoints,
            metafile: metaFile,
            outdir: tmpDir,
            bundle: true,
            splitting: pluginOptions.splitting ?? false,
            platform: 'browser',
            format: 'esm',
            target: pluginOptions.target ?? 'es2017',
            strict: false,
            sourcemap: false,
            minify: pluginOptions.minify ?? snowpackConfig.buildOptions.minify,
            color: true,
            logLevel: 'silent'
          });
          debug(8, 'finished esbuild process without errors');
        } catch(e) {
          debug(9, 'found some erros');
          for (const {loc, text} of e.errors||[]) console.log(esbuildMsg('error', text, loc));
          for (const {loc, text} of e.warnings||[]) console.log(esbuildMsg('warning', text, loc));
          return;
        }
        for (const {loc, text} of result.warnings||[]) console.log(esbuildMsg('warning', text, loc));
        const meta = JSON.parse(fs.readFileSync(metaFile, { encoding: 'utf-8' }));
        debug(10, meta);
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
        debug(11, lookup);
        debug(12, lookupMove);
        for (const k of Object.keys(meta.inputs)) {
          unlinkRmParent(k);
        }
        unlinkRmParent(path.join(snowpackConfig.devOptions.out, snowpackConfig.buildOptions.webModulesUrl, 'import-map.json'));
        unlinkRmParent(path.join(snowpackConfig.devOptions.out, snowpackConfig.buildOptions.metaDir, 'env.js'));
        for (const [k, v] of Object.entries(lookupMove)) {
          try {
            debug(13, k, v);
            fs.mkdirSync(path.dirname(v), { recursive: true });
            fs.renameSync(k, v);
          } catch(e) {
            console.log("Error moving files out of temp directory:", e);
          }
        }
        unlinkRmParent(metaFile);
        snowpackConfig.buildOptions.minify = false; // not anymore required after this step!
      }
    } // end function optimize

  }
}

export default plugin;
