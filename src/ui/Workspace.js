import { Events } from "../core/Events.js";

export default class Workspace {
    constructor(element, eventBus, selectionManager) {
        this.element = element;
        this.eventBus = eventBus;
        this.selectionManager = selectionManager;
        this.model = null;
        this.selectedComponentId = null;
        this.runtimeValues = {};
        this.modifiedComponentIds = new Set();
        this.modifiedLedIds = new Set();
        this.eventBus.on(Events.DEVICE_MODEL_READY, this.onModelReady.bind(this));
        this.eventBus.on(Events.SELECTION_CHANGED, this.onSelectionChanged.bind(this));
        this.eventBus.on(Events.RUNTIME_CHANGED, this.onRuntimeChanged.bind(this));
        this.eventBus.on(Events.WORKING_COPY_CHANGED, this.onWorkingCopyChanged.bind(this));
        this.eventBus.on(Events.CONFIGURATION_COMMITTED, this.onConfigurationCommitted.bind(this));
        this.bindSelectionEvents();
    }

    bindSelectionEvents() {
        this.element.addEventListener("pointerdown", event => {
            const led = event.target.closest("[data-led-id]");
            if (!led || !this.element.contains(led)) return;
            event.preventDefault();
            event.stopPropagation();
            this.selectionManager.select(led.dataset.ledId);
        }, true);

        this.element.addEventListener("click", event => {
            const led = event.target.closest("[data-led-id]");
            if (!led || !this.element.contains(led)) return;
            event.preventDefault();
            event.stopPropagation();
        }, true);
    }

    onModelReady(model) {
        this.model = model;
        this.runtimeValues = model.runtime?.toJSON?.() ?? {};
        this.modifiedComponentIds.clear();
        this.modifiedLedIds.clear();
        this.render();
    }

    onSelectionChanged(id) {
        this.selectedComponentId = id;
        this.updateSelectionVisuals();
    }

    onRuntimeChanged(payload = {}) {
        if (!payload.componentId) return;
        this.runtimeValues[payload.componentId] = payload.value;
        this.updateRuntimeVisual(payload.componentId);
    }

    onWorkingCopyChanged(payload = {}) {
        if (payload.componentId) {
            const isLed = String(this.selectedComponentId ?? "").endsWith("-LED") &&
                this.getControllerIdFromLed(this.selectedComponentId) === payload.componentId;
            if (isLed) this.modifiedLedIds.add(`${payload.componentId}-LED`);
            else this.modifiedComponentIds.add(payload.componentId);
            this.updateModifiedVisuals();
            this.updateLedVisual(payload.componentId);
            return;
        }

        if (payload.dirty === false) {
            this.modifiedComponentIds.clear();
            this.modifiedLedIds.clear();
        }
        this.render();
    }

    onConfigurationCommitted() {
        this.modifiedComponentIds.clear();
        this.modifiedLedIds.clear();
        this.updateModifiedVisuals();
    }

    getControllerIdFromLed(id) {
        return String(id ?? "").endsWith("-LED") ? String(id).slice(0, -4) : null;
    }

    render() {
        if (!this.model?.hardware) {
            this.element.innerHTML = `<div class="waiting">Waiting for a bipoLab device...</div>`;
            return;
        }

        const components = this.model.hardware.getComponents();
        const name = this.model.device.name;
        const kind = components[0]?.type;
        const surfaceClass = kind === "fader"
            ? "device-panel--faders"
            : kind === "button" || kind === "switch"
                ? "device-panel--buttons"
                : kind === "trigger"
                    ? "device-panel--triggers"
                    : "device-panel--knobs";
        const gridClass = kind === "fader"
            ? "device-grid device-grid--faders"
            : "device-grid device-grid--4x4";
        const label = kind === "knob"
            ? "POTENTIOMETERS"
            : kind === "button" || kind === "switch"
                ? "BUTTONS"
                : kind === "trigger"
                    ? "TRIGGER INPUTS"
                    : "FADERS";

        this.element.innerHTML = `
            <section class="device-workspace">
                <div class="device-panel ${surfaceClass}">
                    <header class="device-panel__header">
                        <div>
                            <span class="section-label">bipoLab engineering</span>
                            <h1>${name}</h1>
                        </div>
                        <span class="device-workspace__mode">CONFIGURATION · MOCK</span>
                    </header>
                    ${kind === "trigger" ? this.renderTriggerWorkspace(components) : `
                    <div class="${gridClass}" aria-label="${name} controls">
                        ${components.map(component => this.renderComponent(component)).join("")}
                    </div>`}
                    <footer class="device-panel__footer">
                        <span>${kind === "trigger" ? "6 PERFORMANCE PADS · 16 ANALOG INPUTS" : `${components.length} ${label}`}</span>
                        <span>${kind === "trigger" ? "3 × 2 · 8 × 2" : kind === "fader" ? "4 × 1" : "4 × 4"}</span>
                    </footer>
                </div>
            </section>`;

        this.bindComponentEvents();
        this.updateSelectionVisuals();
        this.updateModifiedVisuals();
    }

    renderTriggerWorkspace(components) {
        const pads = components.slice(0, 6);
        const padNames = ["KICK", "SNARE", "HI-HAT", "TOM 1", "CRASH", "RIDE"];

        return `
            <div class="trigger-rack__surface" aria-label="LAB-16D drum pad and trigger rack">
                <section class="trigger-rack__pad-bank">
                    <header class="trigger-rack__section-header">
                        <div>
                            <span class="trigger-rack__eyebrow">DRUM PAD INTERFACE</span>
                            <strong>PERFORMANCE PADS</strong>
                        </div>
                        <span class="trigger-rack__section-meta">3 × 2</span>
                    </header>
                    <div class="trigger-rack__pads">
                        ${pads.map((component, index) => this.renderTriggerPad(component, padNames[index] ?? component.metadata?.defaultName ?? `PAD ${index + 1}`)).join("")}
                    </div>
                </section>

                <section class="trigger-rack__input-bank">
                    <header class="trigger-rack__section-header">
                        <div>
                            <span class="trigger-rack__eyebrow">ANALOG SENSOR INPUTS</span>
                            <strong>TRIGGER PATCH</strong>
                        </div>
                        <span class="trigger-rack__section-meta">8 × 2 · 16 INPUTS</span>
                    </header>
                    <div class="trigger-rack__inputs">
                        ${components.map(component => this.renderComponent(component)).join("")}
                    </div>
                </section>
            </div>`;
    }

    renderTriggerPad(component, label) {
        const controllerSelected = component.id === this.selectedComponentId;
        const value = Math.round(this.getRuntimeValue(component.id));

        return `
            <button class="trigger-performance-pad ${controllerSelected ? "is-selected" : ""}"
                data-component-id="${component.id}"
                type="button"
                aria-label="Configure ${label}"
                title="${label}">
                <span class="trigger-performance-pad__rim"></span>
                <span class="trigger-performance-pad__label">${label}</span>
                <span class="trigger-performance-pad__input">IN ${String(component.metadata?.input ?? "").padStart(2, "0")}</span>
                <span class="trigger-performance-pad__value">${value}</span>
            </button>`;
    }
    renderComponent(component) {
        const controllerSelected = component.id === this.selectedComponentId;
        const ledId = `${component.id}-LED`;
        const ledSelected = ledId === this.selectedComponentId;
        const controllerModified = this.modifiedComponentIds.has(component.id);
        const ledModified = this.modifiedLedIds.has(ledId);
        const value = Math.round(this.getRuntimeValue(component.id));
        const cfg = this.model.getComponentConfiguration(component.id) ?? {};
        const led = cfg.led ?? {
            id: ledId,
            mode: "static",
            color: { r: 255, g: 255, b: 255 },
            brightness: 100
        };
        const rgb = led.color ?? { r: 255, g: 255, b: 255 };
        const alpha = Math.max(0, Math.min(1, Number(led.brightness ?? 100) / 100));
        const ledStyle = `--led-r:${rgb.r};--led-g:${rgb.g};--led-b:${rgb.b};--led-a:${alpha}`;
        const triggerName = component.metadata?.defaultName ?? `INPUT ${component.metadata?.input ?? ""}`;

        return `
            <div class="device-cell">
                <div class="device-cell__controller ${controllerSelected ? "is-selected" : ""} ${controllerModified ? "is-modified" : ""}">
                    <div class="device-control device-control--${component.type}" data-component-id="${component.id}" tabindex="0" role="button" title="${component.label}" aria-label="Configure ${component.label}" aria-valuemin="0" aria-valuemax="127" aria-valuenow="${value}">
                        ${component.type === "trigger" ? `<span class="trigger-pad__input">${String(component.metadata?.input ?? "").padStart(2, "0")}</span><span class="trigger-pad__name">${triggerName}</span><span class="trigger-pad__value">${value}</span>` : `<span class="device-control__visual" style="--runtime-value:${value}"></span>`}
                    </div>
                </div>
                <div class="device-cell__led ${ledSelected ? "is-selected" : ""} ${ledModified ? "is-modified" : ""}" data-led-id="${ledId}" data-led-component="${component.id}" title="Configure ${ledId}" role="button" tabindex="0" aria-label="Configure LED ${ledId}">
                    <span class="device-control__led ${ledSelected ? "device-control__led--selected" : ""}" style="${ledStyle}"></span>
                </div>
            </div>`;
    }

    bindComponentEvents() {
        this.element.querySelectorAll("[data-component-id]").forEach(control => {
            const id = control.dataset.componentId;
            control.addEventListener("click", event => {
                event.preventDefault();
                this.selectionManager.select(id);
            });
            control.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    this.selectionManager.select(id);
                }
            });
        });
    }
    updateSelectionVisuals() {
        this.element.querySelectorAll("[data-component-id]").forEach(control => {
            const selected = control.dataset.componentId === this.selectedComponentId;
            control.closest(".device-cell__controller")?.classList.toggle("is-selected", selected);
        });
        this.element.querySelectorAll("[data-led-id]").forEach(led => {
            const selected = led.dataset.ledId === this.selectedComponentId;
            led.classList.toggle("is-selected", selected);
            led.querySelector(".device-control__led")?.classList.toggle("device-control__led--selected", selected);
        });
    }

    updateModifiedVisuals() {
        this.element.querySelectorAll("[data-component-id]").forEach(control => {
            const modified = this.modifiedComponentIds.has(control.dataset.componentId);
            control.closest(".device-cell__controller")?.classList.toggle("is-modified", modified);
        });
        this.element.querySelectorAll("[data-led-id]").forEach(led => {
            led.classList.toggle("is-modified", this.modifiedLedIds.has(led.dataset.ledId));
        });
    }

    getRuntimeValue(id) {
        return Number(this.runtimeValues[id] ?? 0);
    }

    setRuntimeValue(id, value) {
        const normalized = Math.round(Math.min(127, Math.max(0, Number(value) || 0)));
        this.runtimeValues[id] = normalized;
        this.model?.setRuntimeValue(id, normalized);
        const control = this.element.querySelector(`[data-component-id="${id}"]`);
        control?.setAttribute("aria-valuenow", normalized);
    }

    updateRuntimeVisual(id) {
        const control = this.element.querySelector(`[data-component-id="${id}"]`);
        if (!control) return;
        const value = this.getRuntimeValue(id);
        control.querySelector(".device-control__visual")?.style.setProperty("--runtime-value", value);
        control.setAttribute("aria-valuenow", value);
    }

    updateLedVisual(id) {
        const control = this.element.querySelector(`[data-component-id="${id}"]`);
        if (!control) return;
        const cfg = this.model.getComponentConfiguration(id) ?? {};
        const led = cfg.led ?? {};
        const rgb = led.color ?? { r: 255, g: 255, b: 255 };
        const alpha = Math.max(0, Math.min(1, Number(led.brightness ?? 100) / 100));
        const element = control.closest(".device-cell")?.querySelector("[data-led-id]");
        if (!element) return;
        const visual = element.querySelector(".device-control__led");
        if (!visual) return;
        visual.style.setProperty("--led-r", rgb.r);
        visual.style.setProperty("--led-g", rgb.g);
        visual.style.setProperty("--led-b", rgb.b);
        visual.style.setProperty("--led-a", alpha);
    }
}
