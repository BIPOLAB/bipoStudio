/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : Events.js
 * Version : 0.1.0
 * Sprint  : 04
 *
 * Centralized application events.
 * --------------------------------------------------------------------
 */

export const Events = Object.freeze({

    // -----------------------------------------------------------------
    // Application
    // -----------------------------------------------------------------

    APPLICATION_STARTING: "application:starting",
    APPLICATION_READY: "application:ready",
    APPLICATION_ERROR: "application:error",

    // -----------------------------------------------------------------
    // Device
    // -----------------------------------------------------------------

    DEVICE_CONNECTING: "device:connecting",
    DEVICE_CONNECTED: "device:connected",

    DEVICE_LOADING_HARDWARE: "device:loading-hardware",
    DEVICE_HARDWARE_LOADED: "device:hardware-loaded",

    DEVICE_LOADING_CONFIGURATION: "device:loading-configuration",
    DEVICE_CONFIGURATION_LOADED: "device:configuration-loaded",

    DEVICE_LOADING_RUNTIME: "device:loading-runtime",
    DEVICE_RUNTIME_LOADED: "device:runtime-loaded",

    DEVICE_MODEL_READY: "device:model-ready",

    // -----------------------------------------------------------------
    // Session
    // -----------------------------------------------------------------

    SESSION_CHANGED: "session:changed",

    // -----------------------------------------------------------------
    // Selection
    // -----------------------------------------------------------------

    SELECTION_CHANGED: "selection:changed"

});