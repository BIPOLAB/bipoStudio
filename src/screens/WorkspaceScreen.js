/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : WorkspaceScreen.js
 * Version : 0.2.0
 * Feature : Configuration + Runtime Monitor
 *
 * Copyright (c) bipoLab engineering
 * --------------------------------------------------------------------
 */

import Screen from "./Screen.js";
import Workspace from "../ui/Workspace.js";
import Inspector from "../ui/Inspector.js";
import MidiMonitor from "../ui/MidiMonitor.js";

export default class WorkspaceScreen extends Screen {

    constructor(element, eventBus, selectionManager, deviceModel) {
        super(element, eventBus);
        this.selectionManager = selectionManager;
        this.deviceModel = deviceModel;
        this.root = null;
        this.workspace = null;
        this.inspector = null;
        this.midiMonitor = null;
    }

    mount() {
        this.createDOM();
        this.createViews();
        this.render();
    }

    createDOM() {
        this.root = document.createElement("div");
        this.root.className = "workspace-screen";

        const workspaceElement = document.createElement("main");
        workspaceElement.className = "workspace-screen__stage";

        const inspectorElement = document.createElement("aside");
        inspectorElement.className = "workspace-screen__inspector";

        const monitorElement = document.createElement("section");
        monitorElement.className = "workspace-screen__monitor";

        this.root.append(workspaceElement, inspectorElement, monitorElement);
        this.element.replaceChildren(this.root);

        this.workspaceElement = workspaceElement;
        this.inspectorElement = inspectorElement;
        this.monitorElement = monitorElement;
    }

    createViews() {
        this.workspace = new Workspace(this.workspaceElement, this.eventBus, this.selectionManager);
        this.inspector = new Inspector(this.inspectorElement, this.eventBus);
        this.midiMonitor = new MidiMonitor(this.monitorElement, this.eventBus);

        this.workspace.onModelReady(this.deviceModel);
        this.inspector.onModelReady(this.deviceModel);
    }

    render() {
        this.workspace.render();
        this.inspector.render();
        this.midiMonitor.render();
    }

    unmount() {
        this.workspace = null;
        this.inspector = null;
        this.midiMonitor = null;
        this.workspaceElement = null;
        this.inspectorElement = null;
        this.monitorElement = null;
        this.root = null;
        this.clear();
    }
}
