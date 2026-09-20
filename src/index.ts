/**
 * dsh-notifications — Host half.
 * Registers the `dsh-notifications` settings namespace served to the browser
 * client through the shared settings seam (`ctx.settings`).
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the `ctx.settings` Context merge (SettingsProvider seam).
import type {} from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import { SOUND_IDS } from './sound-ids'
import type { NotificationSettings } from './settings-types'

/** Settings namespace served to the browser half. */
export const NOTIFICATIONS_NS = 'dsh-notifications'

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

/**
 * Serve the notifications namespace while a settings provider is live.
 * The registration is an optional-service attach: when no provider is mounted
 * the plugin keeps its composition entry exactly as composed. All behavior
 * lives in the browser client, so the source sink and change hook are
 * intentionally inert.
 * @param ctx - the Host plugin context.
 * @param config - the composition entry config (schema-resolved).
 */
export function apply(ctx: Context, config: NotificationSettings): void {
  ctx.inject(['settings'], (settingsCtx: Context) => {
    settingsCtx.settings.installSection(ctx, NOTIFICATIONS_NS, Config, config, {
      setSource: () => {},
      onChange: () => {},
    })
  })
}
