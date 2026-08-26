/**
 * dsh-notifications — Browser half.
 * Binds the plugin's settings namespace, runs the continuous session
 * observation loop at plugin level (notification sounds fire even while the
 * settings UI is closed), registers the card dictionaries and stylesheet,
 * and contributes a notifications card to the Plugin configuration tab.
 */
// Type-only: pulls the settings shell's ctx.settingsScope Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale package's ctx.locale Context merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the settings.plugin.item SlotMap augmentation (keyed card slot).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { NotificationSettings } from '../settings-types'
import { NotificationsController } from './controller'
import { EN_DICT, ZH } from './locales'
import { NOTIFICATIONS_CSS } from './styles'
import { NotificationsTabController } from './tab-controller'
import { NotificationsCard } from './NotificationsCard'

/** Settings namespace registered by the Host half. */
const NS = 'dsh-notifications'
/** Locale namespace for the tab copy (dot form, per locale convention). */
const LOCALE_NS = 'dsh.notifications' as const
/** Package id stamped onto the injected style tag. */
const PACKAGE_ID = '@deepseek-ai/dsh-notifications'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'sessions', 'settingsScope']

/**
 * Mount the notification engine and the settings tab.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const scope = ctx.settingsScope.bind<NotificationSettings>({ namespace: NS })

  // Continuous session observation even while settings are closed (not part of the component!).
  const controller = new NotificationsController(scope, ctx.sessions)
  ctx.effect(() => {
    const dispose = ctx.sessions.list.subscribe(() => {
      controller.observe(ctx.sessions.list.getSnapshot())
    })
    return dispose
  }, 'dsh-notifications: session observation')

  // Tab dictionaries (bilingual balance enforced at registration).
  ctx.effect(() => ctx.locale.register(LOCALE_NS, { en: EN_DICT, zh: ZH }), 'dsh-notifications: locale')

  // One-time stylesheet injection (tagged so a re-apply is a no-op; the tag
  // stays for the page lifetime, mirroring the shared preset's CSS loader).
  ctx.effect(() => {
    if (typeof document !== 'undefined') {
      const tagId = `${PACKAGE_ID}/tab`
      if (document.querySelector(`style[data-plugin-css="${tagId}"]`) === null) {
        const tag = document.createElement('style')
        tag.dataset.plugin = PACKAGE_ID
        tag.dataset.pluginCss = tagId
        tag.textContent = NOTIFICATIONS_CSS
        document.head.appendChild(tag)
      }
    }
    return () => {}
  }, 'dsh-notifications: styles')

  // The notifications card inside Settings -> Plugins -> Plugin configuration.
  // Keyed by the settings namespace this card edits; the tab dispatches it only
  // when the Host serves that namespace (which our Host half registers).
  const cardController = new NotificationsTabController(scope)
  ctx.slots.inject('settings.plugin.item', function* () {
    yield ctx.slots.register({
      name: 'settings.plugin.item',
      key: NS,
      locale: LOCALE_NS,
      inject: () => cardController.inject(),
    }, NotificationsCard)
  })
}
