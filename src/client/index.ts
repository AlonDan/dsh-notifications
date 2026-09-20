/**
 * dsh-notifications — Browser half.
 * Binds the plugin's settings namespace, runs the continuous session
 * observation loop at plugin level (notification sounds fire even while the
 * settings UI is closed), registers the card dictionaries and stylesheet,
 * and contributes the notifications card to the sidebar Plugins page, on
 * the bundle's own configuration page.
 */
// Type-only: pulls the settings domain's ctx.settingsScope Context merge.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the locale package's ctx.locale Context merge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the Plugins page slot contract (plugins.bundle.config).
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
// Type-only: pulls the Session UI status source (ctx.uiSession).
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
// Type-only: pulls the slot registry service (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
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
export const inject = ['slots', 'locale', 'sessions', 'settingsScope', 'uiSession']

/**
 * Mount the notification engine and the settings tab.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  const scope = ctx.settingsScope.bind<NotificationSettings>({ namespace: NS })

  // Continuous session observation even while settings are closed (not part of the component!).
  // The status source carries the pending question/approval facts the list no longer does.
  const controller = new NotificationsController(scope, ctx.sessions, ctx.uiSession.sessionStatus)
  ctx.effect(() => controller.start(), 'dsh-notifications: session observation')

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

  // The notifications card on the bundle's configuration page of the sidebar
  // Plugins page. Keyed by the bundle's package name; the page dispatches the
  // entry on the bundle's detail page (view 'page').
  const cardController = new NotificationsTabController(scope)
  ctx.slots.inject('plugins.bundle.config', function* () {
    yield ctx.slots.register({
      name: 'plugins.bundle.config',
      key: 'dsh-sound-notifications',
      locale: LOCALE_NS,
      inject: () => cardController.inject(),
    }, NotificationsCard)
  })
}
