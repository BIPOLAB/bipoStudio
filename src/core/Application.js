/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : Application.js
 * Version : 0.8.0
 * Feature : Configuration Workflow + Mock Device Switching
 *
 * Copyright (c) bipoLab engineering
 * --------------------------------------------------------------------
 */

import EventBus from "./EventBus.js";
import { Events } from "./Events.js";
import ScreenHost from "./ScreenHost.js";
import Bridge from "./Bridge.js";
import DeviceModel from "../device/DeviceModel.js";
import UIState from "../studio/UIState.js";
import SelectionManager from "../studio/SelectionManager.js";
import ProgressScreen from "../screens/ProgressScreen.js";
import WorkspaceScreen from "../screens/WorkspaceScreen.js";
import Header from "../ui/Header.js";
import StatusBar from "../ui/StatusBar.js";
import Sidebar from "../ui/Sidebar.js";

export class Application {
    constructor() {
        this.eventBus = new EventBus();
        this.uiState = new UIState();
        this.bridge = new Bridge(this.eventBus);
        this.selectionManager = new SelectionManager(this.eventBus, this.uiState);
        this.deviceModel = new DeviceModel(this.eventBus);
        this.screenHost = null;
        this.ui = null;
        this.workspaceScreen = null;
        this.snapshot = null;
    }

    async start() {
        console.log("Starting bipoStudio...");
        const app = document.getElementById("app");
        if (!app) throw new Error('Application could not start: element "#app" was not found.');
        this.renderApplicationShell(app);
        this.createUserInterface();
        this.bindApplicationEvents();
        this.bridge.start();
        this.showInitialUserInterface();
        this.eventBus.emit(Events.APPLICATION_STARTING);
        try {
            await this.deviceModel.load();
            this.eventBus.emit(Events.APPLICATION_READY, this.deviceModel);
            console.log("bipoStudio ready.");
        } catch (error) {
            const payload = { source: "DeviceModel", message: error instanceof Error ? error.message : String(error), error };
            console.error("bipoStudio could not load the device model:", error);
            this.eventBus.emit(Events.APPLICATION_ERROR, payload);
        }
    }

    renderApplicationShell(app) {
        app.innerHTML = `<div class="studio"><div id="sidebar-host"></div><header id="header"></header><div id="screen-host"></div><footer id="statusbar"></footer></div>`;
    }

    createUserInterface() {
        const headerElement = document.getElementById("header");
        const screenHostElement = document.getElementById("screen-host");
        const statusBarElement = document.getElementById("statusbar");
        const sidebarElement = document.getElementById("sidebar-host");
        if (!headerElement || !screenHostElement || !statusBarElement || !sidebarElement) throw new Error("Application shell could not be initialized.");
        this.screenHost = new ScreenHost(screenHostElement);
        this.ui = { header: new Header(headerElement, this.eventBus), statusBar: new StatusBar(statusBarElement, this.eventBus), sidebar: new Sidebar(sidebarElement, this.eventBus) };
    }

    bindApplicationEvents() {
        this.eventBus.on(Events.DEVICE_MODEL_READY, model => this.mountWorkspace(model));
        this.eventBus.on(Events.MOCK_DEVICE_CHANGE_REQUEST, deviceId => this.switchMockDevice(deviceId));
        this.eventBus.on(Events.CONNECTIVITY_REQUEST, payload => this.handleConnectivityRequest(payload));
        this.eventBus.on(Events.CONFIGURATION_UNDO_REQUEST, () => this.handleUndo());
        this.eventBus.on(Events.CONFIGURATION_REDO_REQUEST, () => this.handleRedo());
        this.eventBus.on(Events.CONFIGURATION_TOOLS_REQUEST, payload => this.handleConfigurationTool(payload));
        this.eventBus.on(Events.DEVICE_RECONNECT_REQUEST, () => this.reconnectDevice());
        this.eventBus.on(Events.CONFIGURATION_RESET_REQUEST, () => {
            this.deviceModel.resetWorkingCopy();
            this.ui.statusBar.status = "Changes reset";
            this.ui.statusBar.render();
        });
        this.eventBus.on(Events.CONFIGURATION_COMMIT_REQUEST, async () => {
            this.ui.statusBar.status = "Saving configuration...";
            this.ui.statusBar.render();
            const committed = await this.deviceModel.commitConfiguration();
            this.ui.statusBar.status = committed ? "Configuration saved" : "No changes to save";
            this.ui.statusBar.render();
        });
        this.eventBus.on(Events.CONFIGURATION_ERROR, error => {
            this.ui.statusBar.status = `Save failed: ${error?.message ?? error}`;
            this.ui.statusBar.render();
        });
    }

    mountWorkspace(model) {
        if (!this.workspaceScreen) {
            this.workspaceScreen = new WorkspaceScreen(this.screenHost.element, this.eventBus, this.selectionManager, model);
            this.screenHost.show(this.workspaceScreen);
            return;
        }
        this.workspaceScreen.setModel(model);
    }


    async handleConnectivityRequest(payload = {}) {
        if (payload.action === "bluetooth-enabled") {
            this.ui.statusBar.status = payload.value ? "Enabling Bluetooth MIDI..." : "Disabling Bluetooth MIDI...";
            this.ui.statusBar.render();
            const ok = await this.deviceModel.setBluetoothEnabled(payload.value);
            this.ui.statusBar.status = ok ? (payload.value ? "Bluetooth MIDI enabled" : "Bluetooth MIDI disabled") : "Bluetooth update failed";
            this.ui.statusBar.render();
            return;
        }
        if (payload.action === "midi-output") {
            const ok = await this.deviceModel.setMidiOutputEnabled(payload.output, payload.value);
            this.ui.statusBar.status = ok ? `${payload.output.toUpperCase()} MIDI output ${payload.value ? "enabled" : "disabled"}` : "MIDI output update failed";
            this.ui.statusBar.render();
            return;
        }
        if (payload.action === "bluetooth-name") {
            const ok = await this.deviceModel.setBluetoothName(payload.value);
            this.ui.statusBar.status = ok ? "Bluetooth MIDI name updated" : "Bluetooth name update failed";
            this.ui.statusBar.render();
        }
    }

    handleUndo() {
        if (!this.deviceModel.undoWorkingCopy()) return;
        this.ui.statusBar.status = "Undid last change";
        this.ui.statusBar.render();
    }

    handleRedo() {
        if (!this.deviceModel.redoWorkingCopy()) return;
        this.ui.statusBar.status = "Redid last change";
        this.ui.statusBar.render();
    }

    handleConfigurationTool(payload = {}) {
        switch (payload.action) {
            case "snapshot":
                this.snapshot = this.deviceModel.createSnapshot();
                this.ui.statusBar.status = "Configuration snapshot captured";
                this.ui.statusBar.render();
                break;
            case "restore-snapshot":
                if (this.snapshot && this.deviceModel.restoreSnapshot(this.snapshot)) {
                    this.ui.statusBar.status = "Configuration snapshot restored";
                } else {
                    this.ui.statusBar.status = "No snapshot available";
                }
                this.ui.statusBar.render();
                break;
            case "preset-save": {
                const name = window.prompt("Preset name", "My preset");
                if (name && this.deviceModel.savePreset(name)) this.ui.statusBar.status = `Preset "${name}" saved`;
                else this.ui.statusBar.status = "Preset was not saved";
                this.ui.statusBar.render();
                break;
            }
            case "preset-load": {
                const presets = this.deviceModel.listPresets();
                if (!presets.length) {
                    this.ui.statusBar.status = "No saved presets for this device";
                    this.ui.statusBar.render();
                    break;
                }
                const names = presets.map((preset, index) => `${index + 1}. ${preset.name}`).join("\n");
                const selected = window.prompt(`Load preset:\n\n${names}\n\nEnter preset name`, presets[0].name);
                if (selected && this.deviceModel.loadPreset(selected)) this.ui.statusBar.status = `Preset "${selected}" loaded into working copy`;
                else this.ui.statusBar.status = "Preset was not loaded";
                this.ui.statusBar.render();
                break;
            }
            case "export":
                this.downloadConfiguration();
                break;
            case "import":
                if (this.deviceModel.importConfiguration(payload.payload)) {
                    this.ui.statusBar.status = "Configuration imported into working copy";
                } else {
                    this.ui.statusBar.status = "Import rejected: no matching components";
                }
                this.ui.statusBar.render();
                break;
            case "validate":
                this.showValidationResult();
                break;
            case "error":
                this.ui.statusBar.status = payload.message ?? "Configuration tool error";
                this.ui.statusBar.render();
                break;
        }
    }

    downloadConfiguration() {
        const payload = this.deviceModel.exportConfiguration();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${payload.model ?? "bipoStudio"}-configuration.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.ui.statusBar.status = "Configuration exported";
        this.ui.statusBar.render();
    }

    showValidationResult() {
        const issues = this.deviceModel.validateConfiguration();
        if (!issues.length) {
            this.ui.statusBar.status = "Configuration check: no issues";
        } else {
            const errors = issues.filter(issue => issue.severity === "error").length;
            const warnings = issues.filter(issue => issue.severity === "warning").length;
            this.ui.statusBar.status = `Configuration check: ${errors} errors · ${warnings} warnings`;
            console.table(issues);
        }
        this.ui.statusBar.render();
    }

    async reconnectDevice() {
        try {
            this.ui.statusBar.status = "Reconnecting device...";
            this.ui.statusBar.render();
            this.selectionManager.clear();
            await this.deviceModel.load();
            this.ui.statusBar.status = "Device reconnected";
        } catch (error) {
            this.ui.statusBar.status = `Reconnect failed: ${error?.message ?? error}`;
        }
        this.ui.statusBar.render();
    }

    async switchMockDevice(deviceId) {
        if (!deviceId || deviceId === this.deviceModel.device?.id) return;
        try {
            this.ui.statusBar.status = "Loading device...";
            this.ui.statusBar.render();

            // Clear the old selection before the new hardware is loaded so no
            // controller/LED ID from the previous mock can leak into the new one.
            this.selectionManager.clear();

            this.deviceModel.core.setMockDevice(deviceId);
            await this.deviceModel.load();
            this.ui.statusBar.status = "Device loaded";
            this.ui.statusBar.render();
        } catch (error) {
            console.error("Could not switch mock device:", error);
            this.ui.statusBar.status = `Device load failed: ${error?.message ?? error}`;
            this.ui.statusBar.render();
        }
    }

    showInitialUserInterface() {
        this.ui.header.show();
        this.ui.statusBar.show();
        this.ui.sidebar.show();
        const progressScreen = new ProgressScreen(this.screenHost.element, this.eventBus);
        this.screenHost.show(progressScreen);
    }
}
