/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : Events.js
 * Version : 0.7.0
 *
 * Centralized application events.
 * --------------------------------------------------------------------
 */

export const Events = Object.freeze({
    APPLICATION_STARTING: "application:starting",
    APPLICATION_READY: "application:ready",
    APPLICATION_ERROR: "application:error",

    DEVICE_CONNECTING: "device:connecting",
    DEVICE_CONNECTED: "device:connected",
    DEVICE_LOADING_HARDWARE: "device:loading-hardware",
    DEVICE_HARDWARE_LOADED: "device:hardware-loaded",
    DEVICE_LOADING_CONFIGURATION: "device:loading-configuration",
    DEVICE_CONFIGURATION_LOADED: "device:configuration-loaded",
    DEVICE_LOADING_RUNTIME: "device:loading-runtime",
    DEVICE_RUNTIME_LOADED: "device:runtime-loaded",
    DEVICE_MODEL_READY: "device:model-ready",

    SESSION_CHANGED: "session:changed",
    SELECTION_CHANGED: "selection:changed",
    RUNTIME_CHANGED: "runtime:changed",
    MIDI_MESSAGE: "midi:message",
    MOCK_DEVICE_CHANGE_REQUEST: "mock-device:change-request",
    CONNECTIVITY_CHANGED: "connectivity:changed",
    CONNECTIVITY_REQUEST: "connectivity:request",
    CONFIGURATION_UNDO_REQUEST: "configuration:undo-request",
    CONFIGURATION_REDO_REQUEST: "configuration:redo-request",
    CONFIGURATION_TOOLS_REQUEST: "configuration:tools-request",

    WORKING_COPY_CHANGED: "working-copy:changed",
    CONFIGURATION_COMMIT_REQUEST: "configuration:commit-request",
    CONFIGURATION_RESET_REQUEST: "configuration:reset-request",
    CONFIGURATION_COMMITTED: "configuration:committed",
    CONFIGURATION_ERROR: "configuration:error"
});
