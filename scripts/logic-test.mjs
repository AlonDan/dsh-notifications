/**
 * Headless logic test for the client bundle. Materializes the factory with a
 * fake ctx (settings scope + session list + slots + locale) and drives
 * synthetic SessionListState edges through the compiled observation loop.
 * Asserts which events reach play() (via its console marker) and which
 * oscillator notes the WebAudio fakes receive, covering all six notification
 * paths, default settings, mute gating, volume propagation, first-observation
 * priming (no phantom playback), and the stale turn-error regression.
 * Not part of the published package.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const req = createRequire(import.meta.url)

// --- WebAudio fakes ---------------------------------------------------------
const REC = { oscStarts: [], masterGain: null, ctxCount: 0 }

class FakeParam {
  constructor() { this.value = 0 }
  setValueAtTime(v) { this.value = v }
  exponentialRampToValueAtTime() {}
}
class FakeOsc {
  constructor() { this.type = 'sine'; this.frequency = new FakeParam() }
  connect() {}
  start() { REC.oscStarts.push({ freq: this.frequency.value, type: this.type }) }
  stop() {}
}
class FakeGainNode {
  constructor() { this.gain = new FakeParam() }
  connect() {}
}
class FakeAudioContext {
  constructor() {
    REC.ctxCount++
    this.state = 'running'
    this.currentTime = 0
    this.destination = {}
  }
  createOscillator() { return new FakeOsc() }
  createGain() {
    const node = new FakeGainNode()
    if (REC.masterGain === null) REC.masterGain = node.gain
    return node
  }
  resume() {}
}

globalThis.window = globalThis
window.AudioContext = FakeAudioContext

// Capture the controller's edge marker; keep all other console output.
const realLog = console.log
const edges = []
console.log = (...a) => {
  const line = a.join(' ')
  if (line.startsWith('[dsh-notifications] edge:')) {
    edges.push(line.slice('[dsh-notifications] edge:'.length).trim())
    return
  }
  realLog(...a)
}

// --- Fake ctx ---------------------------------------------------------------
const DEFAULTS = {
  master: true, volume: 100,
  questionOn: true, questionSound: 'chime',
  approvalOn: true, approvalSound: 'pulse',
  taskOn: true, taskSound: 'complete',
  jobOn: true, jobSound: 'sparkle',
  subagentOn: false, subagentSound: 'soft-ping',
  errorOn: true, errorSound: 'alert',
}
const settings = { ...DEFAULTS }
const scope = {
  getSnapshot: () => ({ status: 'ready', value: settings }),
  set: (key, value) => { settings[key] = value; return Promise.resolve() },
}

let listState = { current: undefined, byId: {}, jobsBySession: {} }
let convNodes = []
const listeners = new Set()
const effects = []
const localeRegs = []
let cardSpec = null
let CardComponent = null

const ctx = {
  settingsScope: { bind: () => scope },
  sessions: {
    list: {
      subscribe: (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
      getSnapshot: () => listState,
    },
    binding: () => ({ session: { getSnapshot: () => ({ nodes: convNodes }) } }),
  },
  locale: { register: (ns, dict) => { localeRegs.push([ns, Object.keys(dict.en).sort(), Object.keys(dict.zh).sort()]) } },
  slots: {
    inject: (name, gen) => {
      const it = gen()
      it.next() // runs the body up to the yield; register() is called inside
      return () => {}
    },
    register: (spec, component) => { cardSpec = spec; CardComponent = component; return () => {} },
  },
  effect: (fn, label) => { fn(); effects.push(label) },
}

// --- Load and apply the compiled bundle --------------------------------------
const registered = {}
window.__ModuleLoader__ = { load: ({ id, factory }) => { registered[id] = factory } }
req(fileURLToPath(new URL('../lib/client.js', import.meta.url)))
const factory = registered['dsh-notifications']
if (typeof factory !== 'function') {
  realLog('FAIL: no factory registered for dsh-notifications')
  process.exit(1)
}
const exportsObj = factory((name) => {
  if (name === 'react' || name === 'react/jsx-runtime') return req(name)
  throw new Error(`unexpected runtime require: ${name}`)
})
exportsObj.apply(ctx)

// --- Assertion helpers --------------------------------------------------------
let failures = 0
let checks = 0
function check(name, cond, detail) {
  checks++
  if (cond) realLog(`ok   - ${name}`)
  else { failures++; realLog(`FAIL - ${name}${detail ? ': ' + detail : ''}`) }
}
const close = (a, b) => Math.abs(a - b) < 1e-9
function freqsSince(i) { return REC.oscStarts.slice(i).map((o) => o.freq) }
function expectFreqs(name, from, expected) {
  const got = freqsSince(from)
  check(name, got.length === expected.length && got.every((f, i) => close(f, expected[i])), `got [${got}] want [${expected}]`)
}

// --- Apply-level checks -------------------------------------------------------
check('card registered into settings.plugin.item', cardSpec !== null && CardComponent !== null)
check('card keyed by the settings namespace', cardSpec?.key === 'dsh-notifications')
check('card locale is dsh.notifications', cardSpec?.locale === 'dsh.notifications')
const face = cardSpec?.inject()
check('face exposes controller + scope hook', !!face && typeof face.controller.playTest === 'function' && face.hooks.notifications === scope)
check('locale dicts registered with identical en/zh key sets', localeRegs.length === 1 && localeRegs[0][1].length > 0 && JSON.stringify(localeRegs[0][1]) === JSON.stringify(localeRegs[0][2]), JSON.stringify(localeRegs))
check('three effects registered', effects.length === 3, effects.join(', '))

// --- Drive synthetic edges ----------------------------------------------------
const base = {
  current: 's1',
  byId: { s1: { running: false, pendingInteraction: undefined } },
  jobsBySession: {},
}
function setList(patch) {
  listState = patch
  for (const cb of listeners) cb()
}

// S0: first observation primes without playing.
let n = REC.oscStarts.length
setList(base)
check('S0 prime: no edge', edges.length === 0, edges.join(','))
check('S0 prime: no notes', REC.oscStarts.length === n)

// S1: question asked -> chime.
n = REC.oscStarts.length
setList({ ...base, byId: { s1: { running: false, pendingInteraction: 'question' } } })
check('S1 question edge', edges.at(-1) === 'question', edges.join(','))
expectFreqs('S1 chime notes', n, [659.25, 880])

// S2: question resolved -> silence.
n = REC.oscStarts.length
setList(base)
check('S2 resolve: no edge', edges.length === 1, edges.join(','))
check('S2 resolve: no notes', REC.oscStarts.length === n)

// S3: plan review counts as question -> chime.
n = REC.oscStarts.length
setList({ ...base, byId: { s1: { running: false, pendingInteraction: 'plan-review' } } })
check('S3 plan-review edge is question', edges.at(-1) === 'question', edges.join(','))
expectFreqs('S3 chime notes', n, [659.25, 880])

// S4: approval requested -> pulse.
n = REC.oscStarts.length
setList({ ...base, byId: { s1: { running: false, pendingInteraction: 'approval' } } })
check('S4 approval edge', edges.at(-1) === 'approval', edges.join(','))
expectFreqs('S4 pulse notes', n, [660, 660])

// S5-S6: normal turn -> task (complete).
n = REC.oscStarts.length
setList({ ...base, byId: { s1: { running: true, pendingInteraction: undefined } } })
check('S5 turn start: no edge', edges.length === 3, edges.join(','))
setList({ ...base, byId: { s1: { running: false, pendingInteraction: undefined } } })
check('S6 task edge', edges.at(-1) === 'task', edges.join(','))
expectFreqs('S6 complete notes', n, [523.25, 659.25, 784])

// S7-S8: failing turn -> error (alert, square waves).
n = REC.oscStarts.length
setList({ ...base, byId: { s1: { running: true, pendingInteraction: undefined } } })
convNodes = [{ kind: 'turn-error', seq: 1 }]
setList({ ...base, byId: { s1: { running: false, pendingInteraction: undefined } } })
check('S8 error edge', edges.at(-1) === 'error', edges.join(','))
expectFreqs('S8 alert notes', n, [880, 659.25])
check('S8 alert uses square waves', REC.oscStarts.slice(n).every((o) => o.type === 'square'))

// S9: regression - a stale turn-error must not replay on the next normal turn.
n = REC.oscStarts.length
setList({ ...base, byId: { s1: { running: true, pendingInteraction: undefined } } })
setList({ ...base, byId: { s1: { running: false, pendingInteraction: undefined } } })
check('S9 stale error: task edge (not error)', edges.at(-1) === 'task', edges.join(','))
expectFreqs('S9 complete notes', n, [523.25, 659.25, 784])

// S10: a genuinely new error still fires.
n = REC.oscStarts.length
setList({ ...base, byId: { s1: { running: true, pendingInteraction: undefined } } })
convNodes = [{ kind: 'turn-error', seq: 1 }, { kind: 'turn-error', seq: 3 }]
setList({ ...base, byId: { s1: { running: false, pendingInteraction: undefined } } })
check('S10 new error edge', edges.at(-1) === 'error', edges.join(','))
expectFreqs('S10 alert notes', n, [880, 659.25])

// S11-S12: background job completes -> sparkle.
n = REC.oscStarts.length
setList({ ...base, jobsBySession: { s1: [{ id: 'j1', status: 'running' }] } })
check('S11 job prime: no edge', edges.length === 7, edges.join(','))
setList({ ...base, jobsBySession: { s1: [{ id: 'j1', status: 'completed' }] } })
check('S12 job edge', edges.at(-1) === 'job', edges.join(','))
expectFreqs('S12 sparkle notes', n, [1568, 2093, 2637])

// S13: failing job -> error.
n = REC.oscStarts.length
setList({ ...base, jobsBySession: { s1: [{ id: 'j1', status: 'completed' }, { id: 'j2', status: 'running' }] } })
setList({ ...base, jobsBySession: { s1: [{ id: 'j1', status: 'completed' }, { id: 'j2', status: 'failed' }] } })
check('S13 failing job edge is error', edges.at(-1) === 'error', edges.join(','))
expectFreqs('S13 alert notes', n, [880, 659.25])

// S14-S15: subagent finishes while its row is off by default -> logged, silent.
n = REC.oscStarts.length
setList({ ...base, byId: { s1: { running: false, pendingInteraction: undefined }, sa1: { origin: 'subagent', parentId: 's1', running: true } } })
check('S14 subagent prime: no edge', edges.length === 9, edges.join(','))
setList({ ...base, byId: { s1: { running: false, pendingInteraction: undefined }, sa1: { origin: 'subagent', parentId: 's1', running: false } } })
check('S15 subagent edge logged', edges.at(-1) === 'subagent', edges.join(','))
check('S15 default off: no notes', REC.oscStarts.length === n)

// S16: enable the row, retrigger -> soft-ping.
n = REC.oscStarts.length
scope.set('subagentOn', true)
setList({ ...base, byId: { s1: { running: false, pendingInteraction: undefined }, sa1: { origin: 'subagent', parentId: 's1', running: true } } })
setList({ ...base, byId: { s1: { running: false, pendingInteraction: undefined }, sa1: { origin: 'subagent', parentId: 's1', running: false } } })
check('S16 subagent edge after enable', edges.at(-1) === 'subagent', edges.join(','))
expectFreqs('S16 soft-ping note', n, [880])

// S17: master off -> edge logged but silent.
n = REC.oscStarts.length
scope.set('master', false)
setList(base)
setList({ ...base, byId: { s1: { running: false, pendingInteraction: 'question' } } })
check('S17 question edge still logged', edges.at(-1) === 'question', edges.join(','))
check('S17 master off: no notes', REC.oscStarts.length === n)
scope.set('master', true)

// S18: volume change + test button -> complete at the new master gain.
n = REC.oscStarts.length
scope.set('volume', 50)
face.controller.playTest('task')
expectFreqs('S18 playTest task notes', n, [523.25, 659.25, 784])
check('S18 master gain follows volume 50', REC.masterGain !== null && close(REC.masterGain.value, Math.pow(0.5, 1.5) * 0.9), `got ${REC.masterGain?.value}`)

// --- Summary -------------------------------------------------------------------
realLog(`checks: ${checks}, failures: ${failures}`)
if (failures > 0) process.exit(1)
realLog('LOGIC TEST OK')
