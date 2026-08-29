import { Events } from "../core/Events.js";

export default class Inspector {
    constructor(element, eventBus) {
        this.element = element;
        this.eventBus = eventBus;
        this.model = null;
        this.selectedComponentId = null;
        this.eventBus.on(Events.DEVICE_MODEL_READY, this.onModelReady.bind(this));
        this.eventBus.on(Events.SELECTION_CHANGED, this.onSelectionChanged.bind(this));
        this.eventBus.on(Events.WORKING_COPY_CHANGED, this.onWorkingCopyChanged.bind(this));
        this.eventBus.on(Events.RUNTIME_CHANGED, this.onRuntimeChanged.bind(this));
    }
    onModelReady(model) { this.model = model; this.render(); }
    onSelectionChanged(componentId) { this.selectedComponentId = componentId; this.render(); }
    onWorkingCopyChanged() { this.render(); }
    onRuntimeChanged(payload = {}) {
        if (!this.model || payload.componentId !== this.selectedComponentId) return;
        const valueElement = this.element.querySelector("[data-inspector-runtime-value]");
        if (valueElement) valueElement.textContent = payload.value ?? "—";
    }
    render() {
        if (!this.model || !this.selectedComponentId) { this.element.innerHTML = `<div class="inspector-empty"><p>No component selected.</p><span>Select a control on the device to edit its MIDI assignment.</span></div>`; return; }
        const component = this.model.getComponent(this.selectedComponentId);
        const configuration = this.model.getComponentConfiguration(this.selectedComponentId) ?? {};
        if (!component) { this.element.innerHTML = `<div class="inspector-empty">The selected component is not available.</div>`; return; }
        const messageType = configuration.messageType ?? "cc";
        const channel = configuration.channel ?? 1;
        const number = configuration.number ?? 0;
        const buttonMode = configuration.buttonMode ?? configuration.mode ?? "momentary";
        const runtimeValue = this.model.getComponentRuntime(this.selectedComponentId);
        const isButton = component.type === "button" || component.type === "switch";
        const isFader = component.type === "fader";
        const isKnob = component.type === "knob";
        const controlType = isButton ? "Button" : isFader ? "Fader" : isKnob ? "Potentiometer" : component.type;
        this.element.innerHTML = `<section class="inspector-content"><div class="inspector-title"><div><span class="section-label">${controlType.toUpperCase()}</span><h2>${component.label}</h2></div><span class="inspector-id">${component.id}</span></div><div class="inspector-field"><label for="message-type">Message</label><select id="message-type"><option value="cc" ${messageType === "cc" ? "selected" : ""}>Control Change</option><option value="note" ${messageType === "note" ? "selected" : ""}>Note</option></select></div><div class="inspector-grid"><div class="inspector-field"><label for="midi-channel">Channel</label><input id="midi-channel" type="number" min="1" max="16" value="${channel}"></div><div class="inspector-field"><label for="midi-number">Number</label><input id="midi-number" type="number" min="0" max="127" value="${number}"></div></div>${isButton ? `<div class="inspector-field"><label for="button-mode">Button mode</label><select id="button-mode"><option value="momentary" ${buttonMode === "momentary" ? "selected" : ""}>Momentary</option><option value="toggle" ${buttonMode === "toggle" ? "selected" : ""}>Permanent / Toggle</option></select></div>` : ""}<div class="inspector-runtime"><span>Runtime value</span><strong data-inspector-runtime-value>${runtimeValue ?? "—"}</strong></div></section>`;
        this.bindEvents();
    }
    bindEvents() {
        this.element.querySelector("#message-type")?.addEventListener("change", e => this.update({ messageType: e.target.value }));
        this.element.querySelector("#midi-channel")?.addEventListener("change", e => { const value = this.clampInteger(e.target.value, 1, 16); e.target.value = value; this.update({ channel: value }); });
        this.element.querySelector("#midi-number")?.addEventListener("change", e => { const value = this.clampInteger(e.target.value, 0, 127); e.target.value = value; this.update({ number: value }); });
        this.element.querySelector("#button-mode")?.addEventListener("change", e => this.update({ buttonMode: e.target.value, mode: e.target.value }));
    }
    update(patch) { this.model.updateComponentConfiguration(this.selectedComponentId, patch); }
    clampInteger(value, min, max) { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min; }
}
