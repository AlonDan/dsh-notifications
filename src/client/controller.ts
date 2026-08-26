/**
 * Event detection for notification sounds.
 * Watches SessionListState edges (status changes, never statuses) plus the
 * current session's ConversationSnapshot for turn errors, and plays the
 * matching sound per the live settings scope. Runs at plugin level, so it
 * keeps working while the settings tab is closed.
 */
import type {
  ConversationSnapshot, ISessions, JobView, SettingsScope, SessionListState,
} from '@deepseek-ai/dsh-client-runtime/client'
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

export class NotificationsController {
  /** Last seen pendingInteraction per session id (edge detection). */
  private prevPending = new Map<string, string | undefined>()
  /** Last seen running bit per session id (current + its subagents). */
  private prevRunning = new Map<string, boolean>()
  /** Last seen job status per current-session id, then job id. */
  private prevJobs = new Map<string, Map<string, string>>()
  /** TurnErrorNode seqs already accounted for, per session id (reset each turn start). */
  private errorSeqs = new Map<string, Set<number>>()
  /** The list.current this controller is tracking; a change drops stale edges. */
  private trackedCurrent: string | undefined
  /** Last applied volume (avoids redundant gain writes). */
  private appliedVolume = Number.NaN

  constructor(
    private readonly scope: SettingsScope<NotificationSettings>,
    private readonly sessions: ISessions,
  ) {}

  /** Feed one SessionListState snapshot; plays a sound for every edge it contains. */
  observe(list: SessionListState): void {
    const current = list.current
    if (!current) return

    // A different session is now current: drop stale edges so we never replay
    // transitions that happened while another session was in view.
    if (this.trackedCurrent !== current) {
      this.prevPending.clear()
      this.prevRunning.clear()
      this.prevJobs.clear()
      this.errorSeqs.clear()
      this.trackedCurrent = current
    }

    // 1-3 run on the current session's summary.
    const summary = list.byId[current]
    if (summary) {
      // 1. pendingInteraction edge: question / plan-review -> question, approval -> approval.
      const now = summary.pendingInteraction
      if (!this.prevPending.has(current)) {
        // First observation of this session: prime without playing (no history replay).
        this.prevPending.set(current, now)
      } else {
        const before = this.prevPending.get(current)
        if (before !== now) {
          this.prevPending.set(current, now)
          if (now === 'question' || now === 'plan-review') this.play('question')
          else if (now === 'approval') this.play('approval')
        }
      }

      // 2. running edge: false->true starts a turn (fresh error window),
      //    true->false ends it: error when a new TurnErrorNode landed, else task-complete.
      const isRunning = summary.running
      const wasRunning = this.prevRunning.get(current) ?? false
      if (!wasRunning && isRunning) this.errorSeqs.delete(current)
      if (wasRunning && !isRunning) {
        const conv = this.sessions.binding(current)?.session.getSnapshot()
        this.play(this.hasNewTurnError(current, conv) ? 'error' : 'task')
      }
      this.prevRunning.set(current, isRunning)

      // 3. job status transitions visible to the current session.
      this.observeJobs(current, list.jobsBySession[current] ?? [])
    }

    // 4. running edges of subagents owned by the current session.
    for (const [id, s] of Object.entries(list.byId)) {
      if (id === current || s.origin !== 'subagent' || s.parentId !== current) continue
      const was = this.prevRunning.get(id) ?? false
      const is = s.running
      if (was && !is) this.play('subagent')
      this.prevRunning.set(id, is)
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

  /** Diff the current session's job list by id and play on status transitions. */
  private observeJobs(current: string, jobs: readonly JobView[]): void {
    const prev = this.prevJobs.get(current) ?? new Map<string, string>()
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
    this.prevJobs.set(current, now)
  }

  /** True when a TurnErrorNode landed in the conversation since this session's turn started. */
  private hasNewTurnError(sessionId: string, conv: ConversationSnapshot | undefined): boolean {
    const seen = this.errorSeqs.get(sessionId) ?? new Set<number>()
    let fresh = false
    for (const node of conv?.nodes ?? []) {
      if (node.kind !== 'turn-error') continue
      if (!seen.has(node.seq)) {
        seen.add(node.seq)
        fresh = true
      }
    }
    this.errorSeqs.set(sessionId, seen)
    return fresh
  }
}
