/**
 * The notifications card on the bundle's configuration page of the sidebar
 * Plugins page. Same visual language as the built-in plugin cards: a header
 * naming the plugin over its controls, which stay visible (the page shows one
 * card, so there is nothing to fold away). Every change writes straight
 * through `scope.set` (auto-save), so the card carries no save/discard footer.
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { NotificationSettings } from '../settings-types'
import { SOUND_IDS, type SoundId } from '../sound-ids'
import { PLUGIN_VERSION } from '../version'
import { NOTIFICATION_EVENTS, type NotificationEventId, type NotificationsTabFace } from './tab-controller'

/** Props the renderer binds for the notifications card. */
export type NotificationsCardProps =
  PropsRuntime<'plugins.bundle.config'>
  & PropsLocale<'dsh.notifications'>
  & InjectFace<NotificationsTabFace>

/** One event row descriptor (locale keys derived from the event id). */
const ROWS: readonly { id: NotificationEventId, nameKey: `${NotificationEventId}.name`, descKey: `${NotificationEventId}.desc` }[] =
  NOTIFICATION_EVENTS.map(id => ({ id, nameKey: `${id}.name`, descKey: `${id}.desc` }))

/** Human label for a sound id ('bubble-pop' -> 'Bubble Pop'). */
function soundLabel(id: SoundId): string {
  return id.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

/** The row's speaker icon. */
function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
  )
}

/** The pill switch (styled with DSH design tokens). */
function Switch(props: { checked: boolean, label: string, onChange: (checked: boolean) => void }) {
  return (
    <label className="dsh-notif-switch" title={props.label}>
      <input type="checkbox" checked={props.checked} onChange={event => props.onChange(event.target.checked)} aria-label={props.label} />
      <span className="dsh-notif-track"><span className="dsh-notif-thumb" /></span>
    </label>
  )
}

/**
 * Render the notifications card.
 * @param props - locale copy, runtime share, and the injected controller + scope hook.
 * @returns the card, or nothing until the first accepted settings section.
 */
export function NotificationsCard(props: NotificationsCardProps) {
  const { t, controller, view } = props
  const snapshot = props.useNotifications(snap => snap)
  // The bundle's page asks the 'page' view only; guard the render anyway.
  if (view !== 'page' || snapshot.status !== 'ready' || snapshot.value === undefined) return null
  const value: NotificationSettings = snapshot.value
  const title = t('title')

  return (
    <div className="dsh-notif-card">
      <div className="dsh-notif-card-header">
        <span className="dsh-notif-name">{title}</span>
        <span className="dsh-notif-description">{t('description')}</span>
      </div>

      <div className="dsh-notif-card-body">
          <div className="dsh-notif-field">
            <Switch checked={value.master} label={t('master')} onChange={checked => controller.setMaster(checked)} />
            <span className="dsh-notif-field-label">{t('master')}</span>
          </div>

          <div className={value.master ? 'dsh-notif-controls' : 'dsh-notif-controls dimmed'}>
            <div className="dsh-notif-field">
              <span className="dsh-notif-field-label">{t('volume')}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={value.volume}
                onChange={event => controller.setVolumeSetting(Number(event.target.value))}
                aria-label={t('volume')}
              />
              <span className="dsh-notif-volume-value">{value.volume}%</span>
            </div>

            {ROWS.map(row => {
              const on = value[`${row.id}On`]
              return (
                <div key={row.id} className={on ? 'dsh-notif-row' : 'dsh-notif-row off'}>
                  <Switch checked={on} label={t(row.nameKey)} onChange={checked => controller.setEventEnabled(row.id, checked)} />
                  <div className="dsh-notif-row-text">
                    <div className="dsh-notif-row-name">{t(row.nameKey)}</div>
                    <div className="dsh-notif-row-desc">{t(row.descKey)}</div>
                  </div>
                  <select
                    className="dsh-notif-sound-select"
                    value={value[`${row.id}Sound`]}
                    onChange={event => controller.setEventSound(row.id, event.target.value as SoundId)}
                    disabled={!on}
                    aria-label={`${t(row.nameKey)} sound`}
                  >
                    {SOUND_IDS.map(id => (
                      <option key={id} value={id}>{soundLabel(id)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="dsh-notif-test-btn"
                    onClick={() => controller.playTest(row.id)}
                    title="Preview sound"
                    aria-label={`Preview sound for ${t(row.nameKey)}`}
                    disabled={!on}
                  >
                    <SpeakerIcon />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="dsh-notif-tab-footer">
            <span className="dsh-notif-version">DSH Notifications v{PLUGIN_VERSION}</span>
          </div>
        </div>
    </div>
  )
}
