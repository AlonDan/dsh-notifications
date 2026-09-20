/**
 * Standalone reproduction of the DSH client-bundle preset
 * (packages/client/tsdown.client.ts in the repository checkout):
 * a node-half ESM build plus a browser CJS closure-factory bundle that calls
 * window.__ModuleLoader__.load({id, factory}) and resolves externals through
 * the injected require (loader module table).
 */
import type { UserConfig } from 'tsdown'

const ID = 'dsh-sound-notifications'

/** Baseline module-table specifiers the web shell seeds for every client bundle. */
const BASELINE_EXTERNALS: ReadonlySet<string> = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-api-session-controller/client',
])

/** Node-half externals: every production dependency stays an import. */
const isProductionDependency = (specifier: string): boolean => specifier.startsWith('@deepseek-ai/')

export default [
  {
    name: ID,
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: true,
    deps: {
      neverBundle: isProductionDependency,
      alwaysBundle: (specifier: string) => !specifier.startsWith('node:') && !isProductionDependency(specifier),
    },
  },
  {
    name: `${ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    // Clean stays off: the node-half config above already cleaned this directory.
    clean: false,
    sourcemap: true,
    deps: {
      neverBundle: (specifier: string) => BASELINE_EXTERNALS.has(specifier),
      alwaysBundle: (specifier: string) => !BASELINE_EXTERNALS.has(specifier),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
] satisfies UserConfig[]
