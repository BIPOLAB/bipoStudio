/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : ProgressScreen.js
 * Version : 0.1.0
 * Feature : 001 - Boot Experience
 *
 * Copyright (c) bipoLab engineering
 * --------------------------------------------------------------------
 */

import Screen from "./Screen.js";
import { Events } from "../core/Events.js";

const STEP_STATE = Object.freeze({
    PENDING: "pending",
    ACTIVE: "active",
    COMPLETE: "complete",
    ERROR: "error"
});

export default class ProgressScreen extends Screen {

    constructor(element, eventBus) {

        super(element, eventBus);

        this.root = null;
        this.titleElement = null;
        this.messageElement = null;
        this.stepElements = new Map();
        this.unsubscribeCallbacks = [];

        this.title = "Initializing device";
        this.message = "Preparing bipoStudio...";

        this.steps = [
            {
                id: "connection",
                label: "Connecting",
                state: STEP_STATE.PENDING
            },
            {
                id: "hardware",
                label: "Hardware",
                state: STEP_STATE.PENDING
            },
            {
                id: "configuration",
                label: "Configuration",
                state: STEP_STATE.PENDING
            },
            {
                id: "runtime",
                label: "Runtime",
                state: STEP_STATE.PENDING
            }
        ];

    }

    mount() {

        this.createDOM();
        this.bindEvents();
        this.render();

    }

    createDOM() {

        this.root = document.createElement("section");
        this.root.className = "progress-screen";
        this.root.setAttribute("aria-live", "polite");
        this.root.setAttribute("aria-busy", "true");

        const panel = document.createElement("div");
        panel.className = "progress-screen__panel";

        const brand = document.createElement("div");
        brand.className = "progress-screen__brand";
        brand.textContent = "bipoStudio";

        this.titleElement = document.createElement("h1");
        this.titleElement.className = "progress-screen__title";

        this.messageElement = document.createElement("p");
        this.messageElement.className = "progress-screen__message";

        const list = document.createElement("ol");
        list.className = "progress-screen__steps";

        for (const step of this.steps) {

            const item = document.createElement("li");
            item.className = "progress-screen__step";
            item.dataset.stepId = step.id;

            const indicator = document.createElement("span");
            indicator.className = "progress-screen__indicator";
            indicator.setAttribute("aria-hidden", "true");

            const label = document.createElement("span");
            label.className = "progress-screen__step-label";
            label.textContent = step.label;

            item.append(indicator, label);
            list.append(item);

            this.stepElements.set(step.id, item);

        }

        panel.append(
            brand,
            this.titleElement,
            this.messageElement,
            list
        );

        this.root.append(panel);
        this.element.replaceChildren(this.root);

    }

    bindEvents() {

        this.subscribe(
            Events.APPLICATION_STARTING,
            () => {
                this.title = "Initializing device";
                this.message = "Preparing bipoStudio...";
                this.render();
            }
        );

        this.subscribe(
            Events.DEVICE_CONNECTING,
            () => {
                this.activateStep(
                    "connection",
                    "Connecting to a bipoLab device..."
                );
            }
        );

        this.subscribe(
            Events.DEVICE_CONNECTED,
            device => {
                this.completeStep("connection");
                this.message = device?.name
                    ? `${device.name} detected.`
                    : "Device detected.";
                this.render();
            }
        );

        this.subscribe(
            Events.DEVICE_LOADING_HARDWARE,
            () => {
                this.activateStep(
                    "hardware",
                    "Reading hardware..."
                );
            }
        );

        this.subscribe(
            Events.DEVICE_HARDWARE_LOADED,
            () => {
                this.completeStep("hardware");
            }
        );

        this.subscribe(
            Events.DEVICE_LOADING_CONFIGURATION,
            () => {
                this.activateStep(
                    "configuration",
                    "Reading configuration..."
                );
            }
        );

        this.subscribe(
            Events.DEVICE_CONFIGURATION_LOADED,
            () => {
                this.completeStep("configuration");
            }
        );

        this.subscribe(
            Events.DEVICE_LOADING_RUNTIME,
            () => {
                this.activateStep(
                    "runtime",
                    "Reading runtime state..."
                );
            }
        );

        this.subscribe(
            Events.DEVICE_RUNTIME_LOADED,
            () => {
                this.completeStep("runtime");
                this.title = "Device ready";
                this.message = "Opening workspace...";
                this.render();
            }
        );

        this.subscribe(
            Events.APPLICATION_ERROR,
            payload => {
                this.title = "Unable to start bipoStudio";
                this.message = payload?.message ?? "Unknown startup error.";

                const activeStep = this.steps.find(
                    step => step.state === STEP_STATE.ACTIVE
                );

                if (activeStep) {
                    activeStep.state = STEP_STATE.ERROR;
                }

                if (this.root) {
                    this.root.setAttribute("aria-busy", "false");
                }

                this.render();
            }
        );

    }

    subscribe(event, callback) {

        const unsubscribe = this.eventBus.on(
            event,
            callback
        );

        this.unsubscribeCallbacks.push(unsubscribe);

    }

    activateStep(stepId, message) {

        const step = this.getStep(stepId);

        if (!step) {
            return;
        }

        for (const currentStep of this.steps) {

            if (
                currentStep.state === STEP_STATE.ACTIVE &&
                currentStep.id !== stepId
            ) {

                currentStep.state = STEP_STATE.COMPLETE;

            }

        }

        step.state = STEP_STATE.ACTIVE;
        this.message = message;
        this.render();

    }

    completeStep(stepId) {

        const step = this.getStep(stepId);

        if (!step) {
            return;
        }

        step.state = STEP_STATE.COMPLETE;
        this.render();

    }

    getStep(stepId) {

        return this.steps.find(step => step.id === stepId);

    }

    render() {

        if (!this.root) {
            return;
        }

        this.titleElement.textContent = this.title;
        this.messageElement.textContent = this.message;

        for (const step of this.steps) {

            const element = this.stepElements.get(step.id);

            if (!element) {
                continue;
            }

            element.dataset.state = step.state;

            const indicator = element.querySelector(
                ".progress-screen__indicator"
            );

            if (indicator) {

                indicator.textContent = this.getIndicator(step.state);

            }

        }

    }

    getIndicator(state) {

        switch (state) {
            case STEP_STATE.COMPLETE:
                return "✓";
            case STEP_STATE.ACTIVE:
                return "●";
            case STEP_STATE.ERROR:
                return "!";
            default:
                return "○";
        }

    }

    unbindEvents() {

        for (const unsubscribe of this.unsubscribeCallbacks) {

            unsubscribe();

        }

        this.unsubscribeCallbacks = [];

    }

    unmount() {

        this.unbindEvents();

        this.stepElements.clear();
        this.root = null;
        this.titleElement = null;
        this.messageElement = null;

        this.clear();

    }

}
