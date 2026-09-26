# bipoStudio

**bipoStudio** is the fixed-layout configuration studio for bipoLab MIDI controllers built around bipoCore.

The application currently runs against a local hardware mock. The mock supports development of configuration workflows before integration with physical bipoCore firmware.

## Product principles

- bipoStudio is a configuration studio, not a graphical hardware editor.
- Device layouts are fixed by the device model. Users configure controller behavior, MIDI mappings, LEDs, and supported device settings.
- LAB-16D represents a 16-input analog drum-trigger controller; trigger behavior is configured per sensor while the physical rack layout remains fixed.
- The device/firmware is the source of truth for hardware identity, capabilities, runtime values, and committed configuration.
- Mock behavior is development-only and must not be represented as physical-device connectivity.
- Keep the runtime lightweight: vanilla JavaScript, HTML, and CSS, built with Vite.

## Requirements

Install a Node.js version compatible with the installed Vite and Vitest releases, then use npm.

## Development

```sh
npm install
npm run dev
```

In development, the Tools section exposes mock controller selection.

## Validation

```sh
npm run build
npm run test:run
```

## Repository map

```
src/
  core/       Application lifecycle, event bus, screen host, mock core provider
  device/     Device identity, hardware model, configuration, runtime, working copy
  screens/    Screen composition and lifecycle
  studio/     UI state and selection coordination
  ui/         Sidebar, workspace, Inspector, MIDI monitor, header, status bar
  styles/     Design tokens, base styles, shell layout, application styling
  main.js     Browser entry point
assets/       Licensed fonts and static design assets
public/       Public static resources
docs/         Architecture, principles, vocabulary, feature notes
tests/        Automated Vitest tests
```

## Configuration lifecycle

Edits are staged in a per-device working copy. Saving commits the working configuration through the provider; reset restores the working copy to its committed baseline. The mock persists committed state locally per mock device.

## Current scope

This build is a development mock, not a production firmware client. USB/Bluetooth routing and device identity shown in development are simulated. Mock capabilities and version strings are not verified physical-device behavior.
