# DSH Notifications

A DeepSeek Harness plugin that plays short sounds when the agent needs your attention or finishes work: questions, approval requests, turn completion, background jobs, subagents, and errors.

## Features

- Six notification events, each with its own on/off toggle and sound picker
- 20 built-in sounds, synthesized in-browser with WebAudio (no audio files)
- Master enable switch and master volume slider
- Per-row test button to preview any sound
- Auto-save: changes apply immediately and persist across page reloads
- Sounds keep playing while the settings UI is closed (the engine runs at plugin level)

## Where it lives

Settings → Plugins → **Plugin configuration** → "Sound notifications" card.

## Events and defaults

| Event | Meaning | Default sound | Enabled by default |
|---|---|---|---|
| Question asked | The agent asks a question that blocks the session (including plan review) | chime | yes |
| Approval requested | A tool call is waiting for your approval | pulse | yes |
| Task complete | The current turn finished successfully | double-pop | yes |
| Background job finished | A background job completed or was stopped | bubble-pop | yes |
| Subagent finished | A subagent of the current session stopped running | soft-ping | no |
| Error or failure | The turn ended with an error, or a job failed | alert | yes |

## Requirements

- DeepSeek Harness with the web client (a profile that includes the Plugins settings area)
- Tested against the DSH 0.1.1-rc.2 wave

## Installation

```bash
# From a local package folder:
dsh plugin --profile <name> add ./dsh-notifications

# Once published to npm:
dsh plugin add dsh-notifications

# Or from a packed tarball:
pnpm pack                 # produces dsh-notifications-0.0.1.tgz
dsh plugin add ./dsh-notifications-0.0.1.tgz
```

After adding or removing a plugin, restart the DSH web server so the new plugin set takes effect.

## Updating

```bash
dsh plugin --profile <name> update dsh-notifications
```

## Removal

```bash
dsh plugin --profile <name> remove dsh-notifications
```

## Notes and limitations (v1)

- Events are tracked for the **current session** only (its jobs and subagents).
- Browsers block audio until the first user interaction on the page; until then, sounds are silent (this is not an error).
- All sounds are synthesized locally with WebAudio; no network access or files are required.

## Development

```bash
pnpm install
pnpm build        # tsc + tsdown -> lib/
pnpm typecheck
```

The package has two halves: the Host half (`src/index.ts`) registers the `dsh-notifications` settings namespace, and the browser half (`src/client/`) renders the configuration card and runs the continuous session observation loop. The client bundle is emitted in DSH's lazy-CJS module format (see `tsdown.config.ts`).
