# Architecture

## Product boundary

bipoStudio is a fixed-layout configuration client for bipoLab controllers, not a panel editor. Device geometry and available capabilities are supplied by the device identity and hardware description.

The firmware/device is the source of truth for identity, capabilities, runtime values, and committed configuration. During development, `src/core/bipoCore.js` provides a local mock with the same broad read/write/commit shape.

Current development mock families include:

- `LAB-16K`: 16 potentiometers
- `LAB-16B`: 16 buttons
- `LAB-4F`: 4 faders
- `LAB-16D`: 16 analog drum-trigger inputs

## Runtime flow

1. `src/main.js` imports design tokens and styles, creates `Application`, and starts it.
2. `Application` builds the shell, creates the event bus and UI, then loads the device model.
3. `DeviceModel` obtains identity and resources from the provider, creates hardware/configuration/runtime models, and restores an in-session working draft.
4. `WorkspaceScreen` composes the fixed device workspace, Inspector, and MIDI monitor.
5. `WorkingCopy` stages edits separately from committed configuration. Commit and reset are explicit operations.

## Modules

- `core/Application.js`: application composition and cross-screen orchestration.
- `core/EventBus.js`, `core/Events.js`: internal event distribution and event names.
- `core/bipoCore.js`: development mock provider; physical transport integration is future work.
- `device/`: hardware model, component registry, configuration, runtime, and working-copy lifecycle.
- `screens/`: screen-level composition and lifecycle.
- `studio/`: selection and UI state.
- `ui/`: user-facing configuration components.
- `styles/`: design tokens, global base, shell layout, and application/component styles.

## Boundaries

- UI components display/request configuration changes; they do not implement transport protocols.
- Device capabilities gate functionality; do not assume all models support every setting.
- Mock-only controls remain development-only.
- Isolated configuration logic should have automated tests.
