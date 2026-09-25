# Product and engineering principles

1. **Configurator, not editor.** Fixed device geometry is represented for selection and configuration. Do not add drag-and-drop, SVG layout editing, or arbitrary hardware-layout customization.
2. **Device truth.** Hardware identity, capabilities, runtime state, and committed configuration ultimately come from the connected device/firmware.
3. **Mock transparency.** Mock behavior is for development and must be clearly identified as simulated.
4. **Explicit persistence.** Edits stage in a working copy. Save commits; reset discards staged changes.
5. **Capability-driven UI.** Show controls only when the device reports support for them.
6. **Lightweight runtime.** Prefer vanilla JavaScript and CSS; avoid unnecessary frameworks and dependencies.
7. **Accessible interaction.** Provide keyboard-operable controls, visible focus, and reduced-motion support.
8. **Testable logic.** Keep configuration logic independent of DOM rendering and transport implementation.
9. **Visual restraint.** Use bipoLab’s laboratory-instrument language: functional hierarchy, restrained color, clear spacing, and minimal decoration.
