import { Events } from "../core/Events.js";

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
    onModelReady(model) { this.model = model; this.runtimeValues = model.runtime?.toJSON?.() ?? {}; this.render(); }
    onSelectionChanged(componentId) { this.selectedComponentId = componentId; this.render(); }
    onRuntimeChanged(payload = {}) { if (!payload.componentId) return; this.runtimeValues[payload.componentId] = payload.value; this.updateRuntimeVisual(payload.componentId); }
    render() {
        if (!this.model?.hardware) { this.element.innerHTML = `<div class="waiting">Waiting for a bipoLab device...</div>`; return; }
        const components = this.model.hardware.getComponents();
        const name = this.model.device.name;
        const kind = components[0]?.type;
        const surfaceClass = kind === "fader" ? "device-panel--faders" : kind === "button" || kind === "switch" ? "device-panel--buttons" : "device-panel--knobs";
        const gridClass = kind === "fader" ? "device-grid device-grid--faders" : "device-grid device-grid--4x4";
        const label = kind === "knob" ? "POTENTIOMETERS" : kind === "button" || kind === "switch" ? "BUTTONS" : "FADERS";
        this.element.innerHTML = `<section class="device-workspace"><div class="device-panel ${surfaceClass}"><header class="device-panel__header"><div><span class="section-label">bipoLab engineering</span><h1>${name}</h1></div><span class="device-workspace__mode">CONFIGURATION · MOCK</span></header><div class="${gridClass}" aria-label="${name} controls">${components.map(c => this.renderComponent(c)).join("")}</div><footer class="device-panel__footer"><span>${components.length} ${label}</span><span>${kind === "fader" ? "4 × 1" : "4 × 4"}</span></footer></div><p class="device-workspace__hint">Select a control to configure it. Use the control to test its runtime behavior.</p></section>`;
        this.bindComponentEvents();
    }
    renderComponent(component) {
        const selected = component.id === this.selectedComponentId;
        const value = Math.round(this.getRuntimeValue(component.id));
        const led = component.led ?? { id: `${component.id}-LED`, mode: "static", color: { r: 255, g: 255, b: 255 }, brightness: 100 };
        const rgb = led.color ?? { r: 255, g: 255, b: 255 };
        const alpha = Math.max(0, Math.min(1, Number(led.brightness ?? 100) / 100));
        const ledStyle = `--led-r:${rgb.r};--led-g:${rgb.g};--led-b:${rgb.b};--led-a:${alpha}`;
        return `<div class="device-cell ${selected ? "device-cell--selected" : ""}"><button class="device-control device-control--${component.type}" data-component-id="${component.id}" type="button" title="${component.label}" aria-label="Configure ${component.label}"><span class="device-control__visual" style="--runtime-value:${value}"></span><span class="device-control__led" style="${ledStyle}" title="${led.id}"></span><span class="device-control__label">${component.label}</span><span class="device-control__value" data-runtime-value="${component.id}">${value}</span></button></div>`;
    }
    bindComponentEvents() {
        this.element.querySelectorAll("[data-component-id]").forEach(control => {
            const id = control.dataset.componentId;
            const component = this.model.getComponent(id);
            const configuration = this.model.getComponentConfiguration(id) ?? {};
            const isButton = component?.type === "switch" || component?.type === "button";
            control.addEventListener("click", () => this.selectionManager.select(id));
            if (component?.type === "knob" || component?.type === "fader") {
                let dragging = false, lastY = 0;
                control.addEventListener("pointerdown", event => { dragging = true; lastY = event.clientY; control.setPointerCapture?.(event.pointerId); event.preventDefault(); });
                control.addEventListener("pointermove", event => { if (!dragging) return; const delta = lastY - event.clientY; lastY = event.clientY; this.setRuntimeValue(id, this.getRuntimeValue(id) + delta * (component.type === "fader" ? 1.2 : 0.8)); event.preventDefault(); });
                const stop = event => { dragging = false; control.releasePointerCapture?.(event.pointerId); };
                control.addEventListener("pointerup", stop); control.addEventListener("pointercancel", stop);
            }
            if (isButton) {
                const mode = configuration.mode ?? configuration.buttonMode ?? "momentary";
                if (mode === "toggle") control.addEventListener("click", () => this.setRuntimeValue(id, this.getRuntimeValue(id) > 0 ? 0 : 127));
                else { control.addEventListener("pointerdown", event => { this.setRuntimeValue(id, 127); control.setPointerCapture?.(event.pointerId); }); const release = event => { this.setRuntimeValue(id, 0); control.releasePointerCapture?.(event.pointerId); }; control.addEventListener("pointerup", release); control.addEventListener("pointercancel", release); }
            }
        });
    }
    getRuntimeValue(componentId) { return Number(this.runtimeValues[componentId] ?? 0); }
    setRuntimeValue(componentId, value) { const normalized = Math.round(Math.min(127, Math.max(0, Number(value) || 0))); this.runtimeValues[componentId] = normalized; this.model?.setRuntimeValue(componentId, normalized); }
    updateRuntimeVisual(componentId) { const control = this.element.querySelector(`[data-component-id="${componentId}"]`); if (!control) return; const value = this.getRuntimeValue(componentId); control.querySelector(".device-control__visual")?.style.setProperty("--runtime-value", value); const valueElement = control.querySelector("[data-runtime-value]"); if (valueElement) valueElement.textContent = value; }
}
