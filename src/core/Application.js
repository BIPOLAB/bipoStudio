/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : Application.js
 * Version : 0.6.0
 * Feature : Configuration Workflow
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

export class Application {

    constructor() {
        this.eventBus = new EventBus();
        this.uiState = new UIState();
        this.bridge = new Bridge(this.eventBus);
        this.selectionManager = new SelectionManager(this.eventBus, this.uiState);
        this.deviceModel = new DeviceModel(this.eventBus);
        this.screenHost = null;
        this.ui = null;
    }

    async start() {
        console.log("Starting bipoStudio...");

        const app = document.getElementById("app");
        if (!app) {
            throw new Error('Application could not start: element "#app" was not found.');
        }

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
            const payload = {
                source: "DeviceModel",
                message: error instanceof Error ? error.message : String(error),
                error
            };
            console.error("bipoStudio could not load the device model:", error);
            this.eventBus.emit(Events.APPLICATION_ERROR, payload);
        }
    }

    renderApplicationShell(app) {
        app.innerHTML = `
            <div class="studio">
                <header id="header"></header>
                <div id="screen-host"></div>
                <footer id="statusbar"></footer>
            </div>
        `;
    }

    createUserInterface() {
        const headerElement = document.getElementById("header");
        const screenHostElement = document.getElementById("screen-host");
        const statusBarElement = document.getElementById("statusbar");

        if (!headerElement || !screenHostElement || !statusBarElement) {
            throw new Error("Application shell could not be initialized.");
        }

        this.screenHost = new ScreenHost(screenHostElement);
        this.ui = {
            header: new Header(headerElement, this.eventBus),
            statusBar: new StatusBar(statusBarElement, this.eventBus)
        };
    }

    bindApplicationEvents() {
        this.eventBus.on(Events.DEVICE_MODEL_READY, model => {
            const workspaceScreen = new WorkspaceScreen(
                this.screenHost.element,
                this.eventBus,
                this.selectionManager,
                model
            );
            this.screenHost.show(workspaceScreen);
        });

        this.eventBus.on(Events.CONFIGURATION_RESET_REQUEST, () => {
            this.deviceModel.resetWorkingCopy();
            this.ui.statusBar.status = "Changes reset";
            this.ui.statusBar.render();
        });

        this.eventBus.on(Events.CONFIGURATION_COMMIT_REQUEST, async () => {
            this.ui.statusBar.status = "Saving configuration...";
            this.ui.statusBar.render();

            const committed = await this.deviceModel.commitConfiguration();

            this.ui.statusBar.status = committed
                ? "Configuration saved"
                : "No changes to save";
            this.ui.statusBar.render();
        });

        this.eventBus.on(Events.CONFIGURATION_ERROR, error => {
            this.ui.statusBar.status = `Save failed: ${error?.message ?? error}`;
            this.ui.statusBar.render();
        });
    }

    showInitialUserInterface() {
        if (!this.ui || !this.screenHost) {
            throw new Error("User interface has not been created.");
        }

        this.ui.header.show();
        this.ui.statusBar.show();

        const progressScreen = new ProgressScreen(
            this.screenHost.element,
            this.eventBus
        );
        this.screenHost.show(progressScreen);
    }
}
