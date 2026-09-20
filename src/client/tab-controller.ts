/**
 * The notifications tab's write path. The component renders the scope
 * snapshot (through the injected hook) and routes every user choice through
 * this controller, which performs `scope.set` (auto-save) and test playback.
 */
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { NotificationSettings } from '../settings-types'
import type { SoundId } from '../sound-ids'
import { playSound, setVolume } from './audio'

/** The six notification events in tab row order. */
export const NOTIFICATION_EVENTS = ['question', 'approval', 'task', 'job', 'subagent', 'error'] as const

/** One notification event id. */
export type NotificationEventId = (typeof NOTIFICATION_EVENTS)[number]

/** The registration-side face the tab's slot entry injects. */
export interface NotificationsTabFace {
  /** Write path and test playback (non-hook member, passed through verbatim). */
  controller: NotificationsTabController
  hooks: {
    /** The settings scope itself is the snapshot source (uSES shape). */
    notifications: SettingsScope<NotificationSettings>
  }
}

/** Routes tab writes to the settings scope and plays row test sounds. */
export class NotificationsTabController {
  constructor(private readonly scope: SettingsScope<NotificationSettings>) {}

  /** Build the face the tab's slot registration injects. */
  inject(): NotificationsTabFace {
    return { controller: this, hooks: { notifications: this.scope } }
  }

  /** Toggle the master switch (auto-save). */
  setMaster(enabled: boolean): void {
    void this.scope.set('master', enabled)
  }

  /** Move the master volume slider (auto-save). */
  setVolumeSetting(volume: number): void {
    void this.scope.set('volume', volume)
  }

  /** Toggle one event row (auto-save). */
  setEventEnabled(event: NotificationEventId, enabled: boolean): void {
    void this.scope.set(`${event}On`, enabled)
  }

  /** Pick a row's sound (auto-save). */
  setEventSound(event: NotificationEventId, sound: SoundId): void {
    void this.scope.set(`${event}Sound`, sound)
  }

  /**
   * Play a row's test sound at the current master volume. The click that
   * reaches here is the user gesture that unlocks the AudioContext.
   */
  playTest(event: NotificationEventId): void {
    const snapshot = this.scope.getSnapshot()
    if (snapshot.status !== 'ready' || snapshot.value === undefined) return
    setVolume(snapshot.value.volume)
    playSound(snapshot.value[`${event}Sound` as `${NotificationEventId}Sound`])
  }
}
