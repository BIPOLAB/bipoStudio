import { Events } from "../core/Events.js";

const KNOB_MESSAGE_TYPES = [
    ["cc", "Control Change"],
    ["nrpn", "NRPN"],
    ["rpn", "RPN"],
    ["pitchbend", "Pitch Bend"],
    ["aftertouch", "Channel Aftertouch"]
];

const BUTTON_MESSAGE_TYPES = [
    ["cc", "Control Change"],
    ["note", "Note"],
    ["program", "Program Change"],
    ["nrpn", "NRPN"],
    ["rpn", "RPN"],
    ["mmc", "MIDI Machine Control"],
    ["aftertouch", "Channel Aftertouch"]
];

export default class Inspector {
    constructor(element, eventBus) {
        this.element = element;
        this.eventBus = eventBus;
        this.model = null;
        this.selectedComponentId = null;
        this.runtimeValue = 0;
        this.rgb = { r: 255, g: 255, b: 255 };
        this.brightness = 100;
        this.eventBus.on(Events.DEVICE_MODEL_READY, this.onModelReady.bind(this));
        this.eventBus.on(Events.SELECTION_CHANGED, this.onSelectionChanged.bind(this));
        this.eventBus.on(Events.WORKING_COPY_CHANGED, this.onWorkingCopyChanged.bind(this));
        this.eventBus.on(Events.RUNTIME_CHANGED, this.onRuntimeChanged.bind(this));
    }

    onModelReady(model) {
        this.model = model;
        this.render();
    }

    onSelectionChanged(id) {
        this.selectedComponentId = id;
        this.syncFromSelection();
        this.render();
    }

    onWorkingCopyChanged(payload = {}) {
        if (!payload.componentId || payload.componentId === this.selectedComponentId || payload.componentId === this.getControllerIdFromLed()) {
            this.syncFromSelection();
            this.render();
        }
    }

    onRuntimeChanged(payload = {}) {
        if (payload.componentId === this.selectedComponentId) {
            this.runtimeValue = Number(payload.value) || 0;
            this.updateRuntimeDisplay();
        }
    }

    getControllerIdFromLed() {
        if (!this.selectedComponentId?.endsWith?.("-LED")) return null;
        return this.selectedComponentId.slice(0, -4);
    }

    getSelectedComponent() {
        if (!this.model || !this.selectedComponentId) return null;
        const controllerId = this.getControllerIdFromLed() ?? this.selectedComponentId;
        return this.model.getComponent(controllerId);
    }

    getConfiguration() {
        const component = this.getSelectedComponent();
        return component ? (this.model.getComponentConfiguration(component.id) ?? {}) : null;
    }

    syncFromSelection() {
        const cfg = this.getConfiguration();
        if (!cfg) return;
        const rgb = cfg.led?.color ?? { r: 255, g: 255, b: 255 };
        this.rgb = { r: Number(rgb.r) || 0, g: Number(rgb.g) || 0, b: Number(rgb.b) || 0 };
        this.brightness = Math.max(0, Math.min(100, Number(cfg.led?.brightness ?? 100)));
        this.runtimeValue = Number(this.model.getComponentRuntime(this.getSelectedComponent()?.id) ?? 0);
    }

    render() {
        if (!this.model || !this.selectedComponentId) {
            this.element.innerHTML = `<div class="inspector-empty"><span class="section-label">bipoLab engineering</span><h2>No selection</h2><p>Select a control or LED to configure it.</p></div>`;
            return;
        }

        const component = this.getSelectedComponent();
        if (!component) return;
        const ledSelected = this.selectedComponentId.endsWith("-LED");
        this.element.innerHTML = ledSelected ? this.renderLedInspector(component) : this.renderControllerInspector(component);
        ledSelected ? this.bindLedEvents(component) : this.bindControllerEvents(component);
    }

    renderControllerInspector(component) {
        const cfg = this.model.getComponentConfiguration(component.id) ?? {};
        const types = this.getMessageTypes(component);
        const selectedType = cfg.messageType ?? types[0][0];
        const fields = this.renderMessageFields(component, selectedType, cfg);
        const runtime = this.runtimeValue;

        return `
            <div class="inspector-panel">
                <div class="inspector-panel__header">
                    <span class="section-label">CONTROL CONFIGURATION</span>
                    <h2>${component.label}</h2>
                    <span class="inspector-panel__type">${component.type.toUpperCase()}</span>
                </div>
                <div class="inspector-group">
                    <label class="inspector-field">
                        <span>Message type</span>
                        <select data-field="messageType">
                            ${types.map(([value, label]) => `<option value="${value}" ${selectedType === value ? "selected" : ""}>${label}</option>`).join("")}
                        </select>
                    </label>
                    ${fields}
                </div>
                <div class="inspector-runtime">
                    <span>Runtime</span><strong data-runtime-value>${runtime}</strong><small>MIDI 0–127</small>
                </div>
            </div>`;
    }

    getMessageTypes(component) {
        if (component.type === "knob" || component.type === "fader") return KNOB_MESSAGE_TYPES;
        return BUTTON_MESSAGE_TYPES;
    }

    renderMessageFields(component, type, cfg) {
        const channel = Number(cfg.channel ?? 1);
        const number = Number(cfg.number ?? 0);
        const min = Number(cfg.min ?? 0);
        const max = Number(cfg.max ?? 127);
        const mode = cfg.mode ?? "momentary";

        const channelField = `<label class="inspector-field"><span>MIDI channel</span><select data-field="channel">${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}" ${channel === i + 1 ? "selected" : ""}>${i + 1}</option>`).join("")}</select></label>`;

        if (type === "cc") return `${channelField}${this.numberField("CC number", number, 0, 127, "number")}${this.rangeFields(min, max)}`;
        if (type === "note") return `${channelField}${this.numberField("Note", number, 0, 127, "number")}${this.numberField("Velocity", Number(cfg.velocity ?? 127), 0, 127, "velocity")}${this.buttonModeField(mode)}`;
        if (type === "program") return `${channelField}${this.numberField("Program", number, 0, 127, "number")}${this.numberField("Bank MSB", Number(cfg.bankMsb ?? 0), 0, 127, "bankMsb")}${this.numberField("Bank LSB", Number(cfg.bankLsb ?? 0), 0, 127, "bankLsb")}`;
        if (type === "nrpn" || type === "rpn") return `${channelField}${this.numberField("Parameter MSB", Number(cfg.parameterMsb ?? 0), 0, 127, "parameterMsb")}${this.numberField("Parameter LSB", Number(cfg.parameterLsb ?? number), 0, 127, "parameterLsb")}${this.rangeFields(min, max)}`;
        if (type === "pitchbend") return `${channelField}${this.rangeFields(-8192, 8191, "bendMin", "bendMax")}`;
        if (type === "aftertouch") return `${channelField}${this.rangeFields(min, max)}`;
        if (type === "mmc") return `<label class="inspector-field"><span>MMC command</span><select data-field="mmcCommand">${["stop", "play", "deferred-play", "fast-forward", "rewind", "record-punch-in", "record-punch-out", "pause"].map(v => `<option value="${v}" ${cfg.mmcCommand === v ? "selected" : ""}>${v.replaceAll("-", " ").toUpperCase()}</option>`).join("")}</select></label>`;
        return channelField;
    }

    numberField(label, value, min, max, field) {
        return `<label class="inspector-field"><span>${label}</span><input type="number" data-field="${field}" min="${min}" max="${max}" value="${value}"></label>`;
    }

    rangeFields(min, max, minField = "min", maxField = "max") {
        return `<div class="inspector-field-row">${this.numberField("Minimum", min, min, max, minField)}${this.numberField("Maximum", max, min, max, maxField)}</div>`;
    }

    buttonModeField(mode) {
        return `<label class="inspector-field"><span>Button mode</span><select data-field="mode"><option value="momentary" ${mode === "momentary" ? "selected" : ""}>Momentary</option><option value="toggle" ${mode === "toggle" ? "selected" : ""}>Toggle</option></select></label>`;
    }

    renderLedInspector(component) {
        const cfg = this.model.getComponentConfiguration(component.id) ?? {};
        const led = cfg.led ?? {};
        const rgb = led.color ?? this.rgb;
        const brightness = Number(led.brightness ?? this.brightness);
        const mode = led.mode ?? "static";
        return `
            <div class="inspector-panel inspector-panel--led">
                <div class="inspector-panel__header"><span class="section-label">LED CONFIGURATION</span><h2>${component.label} · LED</h2></div>
                <div class="led-preview" style="--led-r:${rgb.r};--led-g:${rgb.g};--led-b:${rgb.b};--led-a:${brightness / 100}"><span></span></div>
                <div class="inspector-group">
                    <div class="rgb-fields">
                        ${this.numberField("R", rgb.r, 0, 255, "r")}${this.numberField("G", rgb.g, 0, 255, "g")}${this.numberField("B", rgb.b, 0, 255, "b")}
                    </div>
                    <label class="inspector-field"><span>Brightness</span><input type="range" data-field="brightness" min="0" max="100" value="${brightness}"><output data-brightness-value>${brightness}%</output></label>
                    <label class="inspector-field"><span>Mode</span><select data-field="ledMode"><option value="static" ${mode === "static" ? "selected" : ""}>Static</option><option value="off" ${mode === "off" ? "selected" : ""}>Off</option><option value="runtime" ${mode === "runtime" ? "selected" : ""}>Runtime</option></select></label>
                </div>
            </div>`;
    }

    bindControllerEvents(component) {
        this.element.querySelectorAll("[data-field]").forEach(field => {
            field.addEventListener("change", () => {
                const type = this.element.querySelector('[data-field="messageType"]')?.value;
                const key = field.dataset.field;
                const value = ["channel", "number", "velocity", "bankMsb", "bankLsb", "parameterMsb", "parameterLsb", "min", "max", "bendMin", "bendMax"].includes(key)
                    ? Number(field.value)
                    : field.value;
                const patch = { [key]: value };
                if (key === "messageType") {
                    Object.assign(patch, this.defaultsForMessageType(type, component));
                }
                this.model.updateComponentConfiguration(component.id, patch);
            });
        });
    }

    defaultsForMessageType(type, component) {
        if (type === "cc") return { number: component.type === "knob" ? 20 : 0, min: 0, max: 127 };
        if (type === "note") return { number: 60, velocity: 127, mode: "momentary" };
        if (type === "program") return { number: 0, bankMsb: 0, bankLsb: 0 };
        if (type === "nrpn" || type === "rpn") return { parameterMsb: 0, parameterLsb: 0, min: 0, max: 127 };
        if (type === "pitchbend") return { min: -8192, max: 8191 };
        if (type === "aftertouch") return { min: 0, max: 127 };
        return {};
    }

    bindLedEvents(component) {
        const update = patch => this.model.updateComponentConfiguration(component.id, { led: { ...(this.model.getComponentConfiguration(component.id)?.led ?? {}), ...patch } });
        this.element.querySelectorAll('[data-field="r"], [data-field="g"], [data-field="b"]').forEach(input => input.addEventListener("change", () => {
            const color = { ...this.rgb, [input.dataset.field]: Math.max(0, Math.min(255, Number(input.value) || 0)) };
            this.rgb = color;
            update({ color });
        }));
        const brightness = this.element.querySelector('[data-field="brightness"]');
        brightness?.addEventListener("input", () => {
            this.brightness = Number(brightness.value);
            this.element.querySelector("[data-brightness-value]").textContent = `${this.brightness}%`;
            update({ brightness: this.brightness });
        });
        this.element.querySelector('[data-field="ledMode"]')?.addEventListener("change", event => update({ mode: event.target.value }));
    }

    updateRuntimeDisplay() {
        const value = this.element.querySelector("[data-runtime-value]");
        if (value) value.textContent = this.runtimeValue;
    }
}
