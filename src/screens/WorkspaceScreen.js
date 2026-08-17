/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : WorkspaceScreen.js
 * Version : 0.1.0
 * Feature : 001 - Boot Experience
 *
 * Copyright (c) bipoLab engineering
 * --------------------------------------------------------------------
 */

import Screen from "./Screen.js";
import Workspace from "../ui/Workspace.js";
import Inspector from "../ui/Inspector.js";

export default class WorkspaceScreen extends Screen {

    constructor(
        element,
        eventBus,
        selectionManager,
        deviceModel
    ) {

        super(element, eventBus);

        this.selectionManager = selectionManager;
        this.deviceModel = deviceModel;

        this.root = null;
        this.workspace = null;
        this.inspector = null;

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

        this.root.append(
            workspaceElement,
            inspectorElement
        );

        this.element.replaceChildren(this.root);

        this.workspaceElement = workspaceElement;
        this.inspectorElement = inspectorElement;

    }

    createViews() {

        this.workspace = new Workspace(
            this.workspaceElement,
            this.eventBus,
            this.selectionManager
        );

        this.inspector = new Inspector(
            this.inspectorElement,
            this.eventBus
        );

        this.workspace.onModelReady(this.deviceModel);
        this.inspector.onModelReady(this.deviceModel);

    }

    render() {

        this.workspace.render();
        this.inspector.render();

    }

    unmount() {

        this.workspace = null;
        this.inspector = null;
        this.workspaceElement = null;
        this.inspectorElement = null;
        this.root = null;

        this.clear();

    }

}
