/**
 * Notifications card stylesheet, scoped under the `dsh-notif-` prefix so no
 * selector collides with app chrome. Only real DSH design tokens are
 * referenced (the app theme defines them on :root as --dsw-alias-*); nothing
 * here redefines a token. The card mirrors the built-in plugin cards' look
 * (border, radius, hover) and keeps its controls always visible. Injected
 * once as a tagged <style> tag by the client entry (same behavior as the
 * shared preset's global-CSS loader).
 */
export const NOTIFICATIONS_CSS = `
/* Card chrome (mirrors the built-in plugin cards). */
.dsh-notif-card {
  list-style: none;
  border: 1px solid var(--dsw-alias-label-dimmed);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-2);
}

.dsh-notif-card-header {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Name over description: the description is what tells two plugins apart. */
.dsh-notif-name { font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary); }
.dsh-notif-description { font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }

.dsh-notif-card-body { border-top: 1px solid var(--dsw-alias-border-l2); margin: 0 16px; padding-bottom: 8px; }

/* Controls below the master switch dim (and mute) while it is off. */
.dsh-notif-controls.dimmed { opacity: 0.55; pointer-events: none; }
.dsh-notif-controls { border-top: 1px solid var(--dsw-alias-border-l2); }

.dsh-notif-field { display: flex; align-items: center; gap: 12px; padding: 12px 0; min-width: 0; }
.dsh-notif-field-label { font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dsh-notif-field input[type='range'] { flex: 1; max-width: 240px; accent-color: var(--dsw-alias-brand-primary); cursor: pointer; }
.dsh-notif-volume-value { font-size: 12px; color: var(--dsw-alias-label-tertiary); width: 36px; text-align: right; }

/* Switch (pill toggle) built on DSH tokens. */
.dsh-notif-switch { position: relative; display: inline-block; flex: none; width: 36px; height: 20px; cursor: pointer; }
.dsh-notif-switch input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.dsh-notif-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--dsw-alias-bg-module-platform);
  transition: background 0.16s;
  pointer-events: none;
}
.dsh-notif-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: transform 0.16s;
}
.dsh-notif-switch input:checked + .dsh-notif-track { background: var(--dsw-alias-brand-primary); }
.dsh-notif-switch input:checked + .dsh-notif-track .dsh-notif-thumb { transform: translateX(16px); }
.dsh-notif-switch input:focus-visible + .dsh-notif-track { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }

.dsh-notif-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; min-width: 0; }
.dsh-notif-field + .dsh-notif-row, .dsh-notif-row + .dsh-notif-row { border-top: 1px solid var(--dsw-alias-border-l2); }

.dsh-notif-row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dsh-notif-row-name { font-size: 13px; font-weight: 500; line-height: 1.5; color: var(--dsw-alias-label-primary); }
.dsh-notif-row-desc { font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }

.dsh-notif-sound-select {
  flex: none;
  width: 170px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-3);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
}
.dsh-notif-sound-select:focus-visible { outline: none; border-color: var(--dsw-alias-brand-primary); }

.dsh-notif-test-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  transition: background 0.16s, color 0.16s;
}
.dsh-notif-test-btn:hover:not(:disabled) { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-interactive-bg-hover); }
.dsh-notif-test-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }

/* Disabled (muted) row: dimmed text, non-interactive controls. */
.dsh-notif-row.off .dsh-notif-row-name, .dsh-notif-row.off .dsh-notif-row-desc { color: var(--dsw-alias-label-tertiary); }
.dsh-notif-row.off .dsh-notif-sound-select, .dsh-notif-row.off .dsh-notif-test-btn { opacity: 0.45; pointer-events: none; }

/* Card footer: version line. */
.dsh-notif-tab-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 2px 0; }
.dsh-notif-version { font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
`
