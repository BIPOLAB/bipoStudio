import { Events } from "../core/Events.js";

/** Fixed visual representation of the emulated device. */
export default class Workspace {

    constructor(element, eventBus, selectionManager) {
        this.element = element;
        this.eventBus = eventBus;
        this.selectionManager = selectionManager;
        this.model = null;
        this.selectedComponentId = null;
        this.runtimeValues = {};

        this.eventBus.on(Events.DEVICE_MODEL_READY, this.onModelReady.bind(this));
        this.eventBus.on(Events.SELECTION_CHANGED, this.onSelectionChanged.bind(this));
        this.eventBus.on(Events.RUNTIME_CHANGED, this.onRuntimeChanged.bind(this));
    }

    onModelReady(model) {
        this.model = model;
        this.runtimeValues = model.runtime?.toJSON?.() ?? {};
        this.render();
    }

    onSelectionChanged(componentId) {
        this.selectedComponentId = componentId;
        this.render();
    }

    onRuntimeChanged(payload = {}) {
        if (!payload.componentId) return;
        this.runtimeValues[payload.componentId] = payload.value;
        this.updateRuntimeVisual(payload.componentId);
    }

    render() {
        if (!this.model?.hardware) {
            this.element.innerHTML = `<div class="waiting">Waiting for a bipoLab device...</div>`;
            return;
        }

        const components = this.model.hardware.getComponents();
        this.element.innerHTML = `
            <section class="device-workspace">
                <div class="device-workspace__heading">
                    <div><span class="section-label">DEVICE</span><h1>${this.model.device.name}</h1></div>
                    <span class="device-workspace__mode">CONFIGURATION · MOCK</span>
                </div>
                <div class="device-surface-wrap">
                    <div class="device-surface" aria-label="MIMO-LAB device mock">
                        <div class="device-surface__brand">bipoLab engineering</div>
                        <div class="device-surface__model">MIMO-LAB</div>
                        ${components.map(component => this.renderComponent(component)).join("")}
                    </div>
                </div>
                <p class="device-workspace__hint">Interact with a control to test its runtime behavior. Select it to configure MIDI.</p>
            </section>`;
        this.bindComponentEvents();
    }

    renderComponent(component) {
        const selected = component.id === this.selectedComponentId;
        const value = Math.round(this.getRuntimeValue(component.id));
        return `
            <button class="device-control device-control--${component.type} ${selected ? "device-control--selected" : ""}"
                data-component-id="${component.id}"
                style="left:${component.position?.x ?? 0}px;top:${component.position?.y ?? 0}px"
                type="button" title="${component.label}" aria-label="Configure ${component.label}">
                <span class="device-control__visual" style="--runtime-value:${value}"></span>
                <span class="device-control__label">${component.label}</span>
                <span class="device-control__value" data-runtime-value="${component.id}">${value}</span>
            </button>`;
    }

    bindComponentEvents() {
        this.element.querySelectorAll("[data-component-id]").forEach(control => {
            const id = control.dataset.componentId;
            const component = this.model.getComponent(id);

            control.addEventListener("click", () => this.selectionManager.select(id));

            if (component?.type === "knob" || component?.type === "fader") {
                let dragging = false;
                let lastY = 0;
                control.addEventListener("pointerdown", event => {
                    dragging = true;
                    lastY = event.clientY;
                    control.setPointerCapture?.(event.pointerId);
                    event.preventDefault();
                });
                control.addEventListener("pointermove", event => {
                    if (!dragging) return;
                    const delta = lastY - event.clientY;
                    lastY = event.clientY;
                    this.setRuntimeValue(id, this.getRuntimeValue(id) + delta * (component.type === "fader" ? 1.2 : 0.8));
                    event.preventDefault();
                });
                const stop = event => { dragging = false; control.releasePointerCapture?.(event.pointerId); };
                control.addEventListener("pointerup", stop);
                control.addEventListener("pointercancel", stop);
            }

            if (component?.type === "switch") {
                control.addEventListener("dblclick", event => {
                    event.preventDefault();
                    this.setRuntimeValue(id, this.getRuntimeValue(id) > 0 ? 0 : 127);
                });
            }
        });
    }

    getRuntimeValue(componentId) {
        return Number(this.runtimeValues[componentId] ?? 0);
    }

    setRuntimeValue(componentId, value) {
        const normalized = Math.round(Math.min(127, Math.max(0, Number(value) || 0)));
        this.runtimeValues[componentId] = normalized;
        this.model.runtime?.set(componentId, normalized);
        this.eventBus.emit(Events.RUNTIME_CHANGED, { componentId, value: normalized });
    }

    updateRuntimeVisual(componentId) {
        const control = this.element.querySelector(`[data-component-id="${componentId}"]`);
        if (!control) return;
        const value = this.getRuntimeValue(componentId);
        control.querySelector(".device-control__visual")?.style.setProperty("--runtime-value", value);
        const valueElement = control.querySelector("[data-runtime-value]");
        if (valueElement) valueElement.textContent = value;
    }
}
