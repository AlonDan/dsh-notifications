/**
 * dsh-notifications — Host half.
 * Registers the `dsh-notifications` settings namespace served to the browser
 * client through the shared settings surface.
 */
import type { Context } from '@deepseek-ai/cordis'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { SOUND_IDS } from './sound-ids'
import type { NotificationSettings } from './settings-types'

export const NOTIFICATIONS_NS = settingsNamespace('dsh-notifications')

/** The 14 scalar fields the browser tab reads and writes (shared with the client half). */
export type { NotificationSettings }

export const Config: z<NotificationSettings> = z.object({
  master: z.boolean().default(true),
  volume: z.number().step(1).min(0).max(100).default(100),
  questionOn: z.boolean().default(true),
  questionSound: z.union(SOUND_IDS).default('chime'),
  approvalOn: z.boolean().default(true),
  approvalSound: z.union(SOUND_IDS).default('pulse'),
  taskOn: z.boolean().default(true),
  taskSound: z.union(SOUND_IDS).default('complete'),
  jobOn: z.boolean().default(true),
  jobSound: z.union(SOUND_IDS).default('sparkle'),
  subagentOn: z.boolean().default(false),
  subagentSound: z.union(SOUND_IDS).default('soft-ping'),
  errorOn: z.boolean().default(true),
  errorSound: z.union(SOUND_IDS).default('alert'),
})

export function apply(ctx: Context, config: NotificationSettings): void {
  // The Host half only serves the namespace; all behavior lives in the browser
  // client, so the source sink and change hook are intentionally inert.
  installSettingsSection(ctx, NOTIFICATIONS_NS, Config, config, {
    setSource: () => {},
    onChange: () => {},
  })
}
