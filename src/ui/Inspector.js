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

const TYPE_DESCRIPTIONS = {
    cc: "7-bit continuous controller",
    note: "Note trigger with velocity",
    program: "Program and bank selection",
    nrpn: "14-bit non-registered parameter",
    rpn: "14-bit registered parameter",
    pitchbend: "14-bit pitch controller",
    aftertouch: "Channel pressure",
    mmc: "System-exclusive transport command"
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

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
        if (payload.componentId === this.getSelectedControllerId()) {
            this.runtimeValue = Number(payload.value) || 0;
            this.updateRuntimeDisplay();
        }
    }

    getControllerIdFromLed() {
        if (!this.selectedComponentId?.endsWith?.("-LED")) return null;
        return this.selectedComponentId.slice(0, -4);
    }

    getSelectedControllerId() {
        return this.getControllerIdFromLed() ?? this.selectedComponentId;
    }

    getSelectedComponent() {
        if (!this.model || !this.selectedComponentId) return null;
        return this.model.getComponent(this.getSelectedControllerId());
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
        this.runtimeValue = Number(this.model.getComponentRuntime(this.getSelectedControllerId()) ?? 0);
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
        const selectedType = types.some(([value]) => value === cfg.messageType) ? cfg.messageType : types[0][0];
        const fields = this.renderMessageFields(component, selectedType, cfg);

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
                    <div class="inspector-message-description" data-message-description>${TYPE_DESCRIPTIONS[selectedType] ?? "MIDI message"}</div>
                    ${fields}
                </div>
                <div class="inspector-runtime">
                    <span>Runtime</span><strong data-runtime-value>${this.runtimeValue}</strong><small>0–127 input</small>
                </div>
            </div>`;
    }

    getMessageTypes(component) {
        return component.type === "knob" || component.type === "fader" ? KNOB_MESSAGE_TYPES : BUTTON_MESSAGE_TYPES;
    }

    renderMessageFields(component, type, cfg) {
        const channel = Number(cfg.channel ?? 1);
        const number = Number(cfg.number ?? 0);
        const min = Number(cfg.min ?? 0);
        const max = Number(cfg.max ?? 127);
        const mode = cfg.mode ?? "momentary";
        const channelField = `<label class="inspector-field"><span>MIDI channel</span><select data-field="channel">${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}" ${channel === i + 1 ? "selected" : ""}>Channel ${i + 1}</option>`).join("")}</select></label>`;

        if (type === "cc") return `${channelField}${this.numberField("CC number", number, 0, 127, "number")}${this.rangeFields(min, max)}${component.type === "button" ? this.buttonModeField(mode) : this.responseCurveField(cfg)}`;
        if (type === "note") return `${channelField}${this.noteField(number)}${this.numberField("Velocity", Number(cfg.velocity ?? 127), 1, 127, "velocity")}${this.buttonModeField(mode)}`;
        if (type === "program") return `${channelField}${this.numberField("Program", number, 0, 127, "number")}${this.numberField("Bank MSB", Number(cfg.bankMsb ?? 0), 0, 127, "bankMsb")}${this.numberField("Bank LSB", Number(cfg.bankLsb ?? 0), 0, 127, "bankLsb")}`;
        if (type === "nrpn" || type === "rpn") return `${channelField}${this.numberField("Parameter MSB", Number(cfg.parameterMsb ?? 0), 0, 127, "parameterMsb")}${this.numberField("Parameter LSB", Number(cfg.parameterLsb ?? 0), 0, 127, "parameterLsb")}${this.rangeFields(min, max)}${this.responseCurveField(cfg)}`;
        if (type === "pitchbend") return `${channelField}${this.rangeFields(-8192, 8191, "bendMin", "bendMax")}`;
        if (type === "aftertouch") return `${channelField}${this.rangeFields(min, max)}${component.type === "button" ? this.buttonModeField(mode) : ""}`;
        if (type === "mmc") return `<label class="inspector-field"><span>MMC command</span><select data-field="mmcCommand">${["stop", "play", "deferred-play", "fast-forward", "rewind", "record-punch-in", "record-punch-out", "pause"].map(v => `<option value="${v}" ${cfg.mmcCommand === v ? "selected" : ""}>${v.replaceAll("-", " ").toUpperCase()}</option>`).join("")}</select></label><div class="inspector-hint">MMC is sent as a system-exclusive transport command.</div>`;
        return channelField;
    }

    noteField(value) {
        const note = Math.max(0, Math.min(127, Number(value) || 0));
        const name = `${NOTE_NAMES[note % 12]}${Math.floor(note / 12) - 1}`;
        return `<label class="inspector-field"><span>Note</span><div class="inspector-field-inline"><input type="number" data-field="number" min="0" max="127" value="${note}"><output data-note-name>${name}</output></div></label>`;
    }

    responseCurveField(cfg) {
        const curve = cfg.curve ?? "linear";
        return `<label class="inspector-field"><span>Response curve</span><select data-field="curve"><option value="linear" ${curve === "linear" ? "selected" : ""}>Linear</option><option value="soft" ${curve === "soft" ? "selected" : ""}>Soft</option><option value="hard" ${curve === "hard" ? "selected" : ""}>Hard</option><option value="log" ${curve === "log" ? "selected" : ""}>Logarithmic</option><option value="exp" ${curve === "exp" ? "selected" : ""}>Exponential</option></select></label>`;
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
            field.addEventListener("change", () => this.commitControllerField(component, field));
            if (field.dataset.field === "number") field.addEventListener("input", () => this.updateNoteName(field));
        });
    }

    commitControllerField(component, field) {
        const key = field.dataset.field;
        const numeric = ["channel", "number", "velocity", "bankMsb", "bankLsb", "parameterMsb", "parameterLsb", "min", "max", "bendMin", "bendMax"].includes(key);
        const value = numeric ? Number(field.value) : field.value;
        const patch = { [key]: value };
        if (key === "messageType") Object.assign(patch, this.defaultsForMessageType(value, component));
        if (key === "min" || key === "max") {
            const cfg = this.getConfiguration() ?? {};
            const other = key === "min" ? Number(cfg.max ?? 127) : Number(cfg.min ?? 0);
            patch[key] = key === "min" ? Math.min(Number(field.value), other) : Math.max(Number(field.value), other);
        }
        this.model.updateComponentConfiguration(component.id, patch);
    }

    updateNoteName(field) {
        const value = Math.max(0, Math.min(127, Number(field.value) || 0));
        const output = this.element.querySelector("[data-note-name]");
        if (output) output.value = `${NOTE_NAMES[value % 12]}${Math.floor(value / 12) - 1}`;
        if (output) output.textContent = `${NOTE_NAMES[value % 12]}${Math.floor(value / 12) - 1}`;
    }

    defaultsForMessageType(type, component) {
        if (type === "cc") return { number: component.type === "knob" ? 20 : 0, min: 0, max: 127, curve: "linear" };
        if (type === "note") return { number: 60, velocity: 127, mode: "momentary" };
        if (type === "program") return { number: 0, bankMsb: 0, bankLsb: 0 };
        if (type === "nrpn" || type === "rpn") return { parameterMsb: 0, parameterLsb: 0, min: 0, max: 127, curve: "linear" };
        if (type === "pitchbend") return { bendMin: -8192, bendMax: 8191 };
        if (type === "aftertouch") return { min: 0, max: 127 };
        if (type === "mmc") return { mmcCommand: "play" };
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
