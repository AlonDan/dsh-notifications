/**
 * Headless smoke test for the client bundle: registers a fake
 * window.__ModuleLoader__, loads lib/client.js (which only registers its
 * factory), materializes that factory with a stub require, and verifies the
 * exported surface. Catches module-body runtime errors that typecheck and
 * build cannot see. Not part of the published package.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const req = createRequire(import.meta.url)

globalThis.window = globalThis
const registered = {}
window.__ModuleLoader__ = { load: ({ id, factory }) => { registered[id] = factory } }

req(fileURLToPath(new URL('../lib/client.js', import.meta.url)))

const ID = 'dsh-notifications'
const factory = registered[ID]
if (typeof factory !== 'function') {
  console.error(`FAIL: no factory registered for ${ID} (registered: ${Object.keys(registered).join(', ') || 'none'})`)
  process.exit(1)
}

const exportsObj = factory((name) => {
  // The card's local fold state uses useState, so the bundle now requires
  // 'react' as well; both are baseline platform modules.
  if (name === 'react' || name === 'react/jsx-runtime') return req(name)
  throw new Error(`unexpected runtime require: ${name}`)
})

console.log('exports:', Object.keys(exportsObj).join(', '))
if (typeof exportsObj.apply !== 'function') {
  console.error('FAIL: apply is not a function')
  process.exit(1)
}
if (!Array.isArray(exportsObj.inject)) {
  console.error('FAIL: inject is not an array')
  process.exit(1)
}
console.log('inject:', JSON.stringify(exportsObj.inject))
console.log('SMOKE OK')
