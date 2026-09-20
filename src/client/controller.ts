/**
 * Event detection for notification sounds.
 * Watches the Session list edges (running bits, job statuses, subagent rows)
 * plus the Session UI status source (pending questions/approvals) and the
 * last agent error per session, and plays the matching sound per the live
 * settings scope. Only sessions shown in the main view fire sounds, matched
 * to the old current-session behavior. Runs at plugin level, so it keeps
 * working while the settings UI is closed.
 */
import type { ISessions, SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionStatusSnapshot } from '@deepseek-ai/dsh-client-ui-session/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { NotificationSettings } from '../settings-types'
import { playSound, setVolume } from './audio'

/** The six playable notification events. */
export type NotificationEvent = 'question' | 'approval' | 'task' | 'job' | 'subagent' | 'error'

type OnKey = 'questionOn' | 'approvalOn' | 'taskOn' | 'jobOn' | 'subagentOn' | 'errorOn'
type SoundKey = 'questionSound' | 'approvalSound' | 'taskSound' | 'jobSound' | 'subagentSound' | 'errorSound'

const ON_KEY: Record<NotificationEvent, OnKey> = {
  question: 'questionOn',
  approval: 'approvalOn',
  task: 'taskOn',
  job: 'jobOn',
  subagent: 'subagentOn',
  error: 'errorOn',
}

const SOUND_KEY: Record<NotificationEvent, SoundKey> = {
  question: 'questionSound',
  approval: 'approvalSound',
  task: 'taskSound',
  job: 'jobSound',
  subagent: 'subagentSound',
  error: 'errorSound',
}

/** The Session UI status source face (UiSession.sessionStatus). */
type StatusSource = {
  getSnapshot(): SessionStatusSnapshot
  subscribe(listener: () => void): () => void
}

export class NotificationsController {
  /** Last seen pending-interaction key per session id (edge detection). */
  private prevPending = new Map<SessionId, string | undefined>()
  /** Last seen running bit per session id (main sessions + their subagents). */
  private prevRunning = new Map<SessionId, boolean>()
  /** Last seen job status per main session id, then job id. */
  private prevJobs = new Map<SessionId, Map<string, string>>()
  /** Last seen turn-error message per session id (edge detection). */
  private prevError = new Map<SessionId, string | null>()
  /** Sessions currently shown in the main view; only they fire sounds. */
  private readonly main = new Set<SessionId>()
  /** Live retainInfo watches, one per known session id. */
  private readonly retainWatch = new Map<SessionId, () => void>()
  /** Latest list snapshot, used when a session enters the main view. */
  private lastList: SessionListState | undefined
  /** Last applied volume (avoids redundant gain writes). */
  private appliedVolume = Number.NaN

  constructor(
    private readonly scope: SettingsScope<NotificationSettings>,
    private readonly sessions: ISessions,
    private readonly status: StatusSource,
  ) {}

  /**
   * Attach to the session sources; plays an edge sound only for sessions the
   * main view shows.
   * @returns the disposer that drops every watch.
   */
  start(): () => void {
    const onList = () => this.observeList(this.sessions.list.getSnapshot())
    const onStatus = () => this.observeStatus(this.status.getSnapshot())
    const offList = this.sessions.list.subscribe(onList)
    const offStatus = this.status.subscribe(onStatus)
    onList() // prime: adopt every live value without playing.
    onStatus()
    return () => {
      offList()
      offStatus()
      for (const off of this.retainWatch.values()) off()
      this.retainWatch.clear()
      this.main.clear()
      this.prevPending.clear()
      this.prevRunning.clear()
      this.prevJobs.clear()
      this.prevError.clear()
      this.lastList = undefined
    }
  }

  /** Feed one list snapshot; plays the job, subagent, and turn-end edges it contains. */
  private observeList(list: SessionListState): void {
    this.lastList = list
    this.syncRetainWatches(list)
    const byId = list.byId
    for (const id of Object.keys(byId) as SessionId[]) {
      if (!this.main.has(id)) continue
      const summary = byId[id]
      if (!summary) continue
      if (!this.prevRunning.has(id)) this.prime(id)
      // 1. running edge: true->false ends a turn: error when a fresh agent error
      //    is visible, else task-complete.
      const wasRunning = this.prevRunning.get(id) ?? false
      const conv = this.sessions.binding(id)?.session.getSnapshot()
      const error = conv?.lastAgentError ?? null
      if (wasRunning && !summary.running) {
        this.play(error !== this.prevError.get(id) ? 'error' : 'task')
      }
      this.prevRunning.set(id, summary.running)
      this.prevError.set(id, error)

      // 2. job status transitions visible to this session.
      this.observeJobs(id, list.jobsBySession[id] ?? [])
    }
    // 3. running edges of subagents owned by a main session.
    for (const [id, s] of Object.entries(byId) as [SessionId, SessionSummary][]) {
      if (s.origin !== 'subagent') continue
      const parent = s.parentId
      if (parent === undefined || !this.main.has(parent)) continue
      const was = this.prevRunning.get(id) ?? false
      if (was && !s.running) this.play('subagent')
      this.prevRunning.set(id, s.running)
    }
  }

  /** Feed one status snapshot; plays the question/approval edges it contains. */
  private observeStatus(snapshot: SessionStatusSnapshot): void {
    for (const id of [...this.main]) {
      const st = snapshot.get(id)
      const now = st?.pendingInteraction?.key
      if (!this.prevPending.has(id)) {
        // First observation of this session: prime without playing.
        this.prevPending.set(id, now)
        continue
      }
      const before = this.prevPending.get(id)
      if (before === now) continue
      this.prevPending.set(id, now)
      if (now === undefined) continue
      const kind = st?.pendingInteraction?.kind
      if (kind === 'question' || kind === 'plan-review') this.play('question')
      else if (kind === 'approval') this.play('approval')
    }
  }

  /** Play one event's sound when the master toggle and the row toggle both allow it. */
  play(event: NotificationEvent): void {
    console.log('[dsh-notifications] edge:', event)
    const snap = this.scope.getSnapshot()
    if (snap.status !== 'ready' || !snap.value) return
    const s = snap.value
    if (!s.master || !s[ON_KEY[event]]) return
    if (s.volume !== this.appliedVolume) {
      this.appliedVolume = s.volume
      setVolume(s.volume)
    }
    playSound(s[SOUND_KEY[event]])
  }

  /** Diff one session's job list by id and play on status transitions. */
  private observeJobs(sessionId: SessionId, jobs: readonly { id: string; status: string }[]): void {
    const prev = this.prevJobs.get(sessionId) ?? new Map<string, string>()
    const now = new Map<string, string>()
    for (const job of jobs) {
      now.set(job.id, job.status)
      const before = prev.get(job.id)
      if (before === undefined || before === job.status) continue
      if ((before === 'running' || before === 'stopping') && (job.status === 'completed' || job.status === 'killed')) {
        this.play('job')
      } else if (job.status === 'failed') {
        this.play('error')
      }
    }
    this.prevJobs.set(sessionId, now)
  }

  /**
   * Keep one retainInfo watch per live session id. The main view retains the
   * session it shows under the `mainView` source, so its count is the
   * current-session fact the list state no longer carries.
   */
  private syncRetainWatches(list: SessionListState): void {
    const live = new Set(Object.keys(list.byId) as SessionId[])
    for (const id of [...this.retainWatch.keys()]) {
      if (!live.has(id)) {
        this.retainWatch.get(id)?.()
        this.retainWatch.delete(id)
        this.leaveMain(id)
      }
    }
    for (const id of live) this.watchMain(id)
  }

  private watchMain(id: SessionId): void {
    if (this.retainWatch.has(id)) return
    const source = this.sessions.retainInfo(id)
    const update = () => {
      const inMain = (source.getSnapshot().retainedBy.mainView ?? 0) > 0
      if (inMain) this.enterMain(id)
      else this.leaveMain(id)
    }
    update()
    this.retainWatch.set(id, source.subscribe(update))
  }

  /** Adopt every live value for a newly shown session so history never replays. */
  private prime(id: SessionId): void {
    const list = this.lastList
    const summary = list?.byId[id]
    this.prevRunning.set(id, summary?.running ?? false)
    this.prevError.set(id, this.sessions.binding(id)?.session.getSnapshot()?.lastAgentError ?? null)
    this.prevJobs.set(id, new Map((list?.jobsBySession[id] ?? []).map((job): [string, string] => [job.id, job.status])))
    const st = this.status.getSnapshot().get(id)
    this.prevPending.set(id, st?.pendingInteraction?.key)
  }

  private enterMain(id: SessionId): void {
    if (this.main.has(id)) return
    this.main.add(id)
    this.prime(id)
  }

  /** Drop stale edges when a session leaves the main view. */
  private leaveMain(id: SessionId): void {
    if (!this.main.delete(id)) return
    this.prevPending.delete(id)
    this.prevRunning.delete(id)
    this.prevJobs.delete(id)
    this.prevError.delete(id)
  }
}
