/**
 * F.A.I.L. Kit VS Code Extension - esbuild Configuration
 * 
 * Bundles the extension into a single minified file for:
 * - 50-80% faster activation time (loading 1 file vs 500+)
 * - Smaller .vsix package size (tree-shaking + minification)
 * - Better security (code obfuscation via minification)
 */

import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production') || !isWatch;

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './out/extension.js',
  
  // Externalize modules
  external: [
    'vscode',      // Provided by the host environment
    'typescript',  // Large dependency (3.7MB) - keep as runtime dependency
  ],
  
  // Target Node.js (VS Code extensions run in Node)
  platform: 'node',
  format: 'cjs',
  
  // Node.js version supported by VS Code
  target: 'node18',
  
  // Source maps for debugging (maps back to original .ts files)
  sourcemap: true,
  
  // Minify in production for smaller bundle
  minify: isProduction,
  
  // Keep names for better error messages (even when minified)
  keepNames: true,
  
  // Tree-shaking to remove unused code
  treeShaking: true,
  
  // Metadata for analyzing bundle
  metafile: true,
  
  // Log level
  logLevel: 'info',
  
  // Define constants
  define: {
    'process.env.NODE_ENV': isProduction ? '"production"' : '"development"',
  },
};

async function build() {
  try {
    if (isWatch) {
      // Watch mode for development
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('👀 Watching for changes...');
    } else {
      // Production build
      const result = await esbuild.build(buildOptions);
      
      // Analyze bundle size
      if (result.metafile) {
        const text = await esbuild.analyzeMetafile(result.metafile, {
          verbose: false,
        });
        console.log('\n📦 Bundle Analysis:');
        console.log(text);
      }
      
      console.log('✅ Build complete!');
    }
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
