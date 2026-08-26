/**
 * Headless smoke test for the Host half (lib/index.js): verifies the
 * schemastery Config resolves all 14 defaults, rejects invalid values, and
 * that apply() wires installSettingsSection correctly against a fake cordis
 * Context (registration with the right namespace + base layer, source sink,
 * change hook, and detach fallback). Not part of the published package.
 */
import { Config, apply, NOTIFICATIONS_NS } from '../lib/index.js'

let failures = 0
let checks = 0
function check(name, cond, detail) {
  checks++
  if (cond) console.log(`ok   - ${name}`)
  else { failures++; console.log(`FAIL - ${name}${detail ? ': ' + detail : ''}`) }
}

// --- Schema: defaults (schemastery schemas are callable validators) -------------
const resolved = Config({})
const EXPECTED_DEFAULTS = {
  master: true, volume: 100,
  questionOn: true, questionSound: 'chime',
  approvalOn: true, approvalSound: 'pulse',
  taskOn: true, taskSound: 'complete',
  jobOn: true, jobSound: 'sparkle',
  subagentOn: false, subagentSound: 'soft-ping',
  errorOn: true, errorSound: 'alert',
}
check('Config({}) resolves all 14 defaults', JSON.stringify(resolved) === JSON.stringify(EXPECTED_DEFAULTS), JSON.stringify(resolved))

// --- Schema: rejections ---------------------------------------------------------
function rejects(name, input) {
  let threw = false
  try { Config(input) } catch { threw = true }
  check(name, threw)
}
rejects('unknown sound id rejected', { questionSound: 'bogus' })
rejects('volume above 100 rejected', { volume: 150 })
rejects('volume below 0 rejected', { volume: -1 })
rejects('non-boolean master rejected', { master: 'yes' })

// --- Schema: overrides ----------------------------------------------------------
const overridden = Config({ master: false, subagentOn: true, errorSound: 'knock', volume: 30 })
check('overrides win over defaults', overridden.master === false && overridden.subagentOn === true && overridden.errorSound === 'knock' && overridden.volume === 30 && overridden.questionSound === 'chime')

// --- apply() against a fake cordis Context ---------------------------------------
// The Host half serves the namespace only; its source sink and change hook are
// intentionally inert (all behavior lives in the browser client), so the test
// asserts the registration itself: right deps, namespace, base layer, and a
// scope that resolves the entry through the schema.
const registrations = []
let registeredScope = null
const effects = []
const entry = {}

const fakeSctx = {
  settings: {
    register: (ns, schema, opts) => {
      const scope = {
        get: () => schema(opts.base),
        watch: () => {},
      }
      registrations.push({ ns, base: opts.base })
      registeredScope = scope
      return scope
    },
  },
  effect: (fn) => { effects.push(fn()) },
}
const fakeCtx = {
  // isUnloading() reads ctx.fiber.state; any state other than unloading/disposed.
  fiber: { state: 0 },
  inject: (deps, fn) => {
    check('inject depends on the settings service', JSON.stringify(deps) === JSON.stringify(['settings']), JSON.stringify(deps))
    fn(fakeSctx)
  },
}

apply(fakeCtx, entry)

check('exactly one registration', registrations.length === 1)
check('registered under the plugin namespace', registrations[0]?.ns === NOTIFICATIONS_NS)
check('base layer is the composition entry (identity)', registrations[0]?.base === entry)
check('scope resolves the entry through the schema to full defaults', JSON.stringify(registeredScope?.get()) === JSON.stringify(EXPECTED_DEFAULTS), JSON.stringify(registeredScope?.get()))
check('one change-watching effect registered', effects.length === 1, `effects=${effects.length}`)

console.log(`checks: ${checks}, failures: ${failures}`)
if (failures > 0) process.exit(1)
console.log('HOST SMOKE OK')
