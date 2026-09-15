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

    onModelReady(model) { this.model = model; this.render(); }

    onSelectionChanged(id) { this.selectedComponentId = id; this.syncFromSelection(); this.render(); }

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

    getSelectedControllerId() { return this.getControllerIdFromLed() ?? this.selectedComponentId; }

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
        return `
            <div class="inspector-panel">
                <div class="inspector-panel__header"><span class="section-label">CONTROL CONFIGURATION</span><h2>${component.label}</h2><span class="inspector-panel__type">${component.type.toUpperCase()}</span></div>
                <div class="inspector-group">
                    <label class="inspector-field"><span>Message type</span><select data-field="messageType">${types.map(([value, label]) => `<option value="${value}" ${selectedType === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
                    <div class="inspector-message-description" data-message-description>${TYPE_DESCRIPTIONS[selectedType] ?? "MIDI message"}</div>
                    ${this.renderMessageFields(component, selectedType, cfg)}
                </div>
                <div class="inspector-runtime"><span>Runtime</span><strong data-runtime-value>${this.runtimeValue}</strong><small>0–127 input</small></div>
            </div>`;
    }

    getMessageTypes(component) { return component.type === "knob" || component.type === "fader" ? KNOB_MESSAGE_TYPES : BUTTON_MESSAGE_TYPES; }

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

    numberField(label, value, min, max, field) { return `<label class="inspector-field"><span>${label}</span><input type="number" data-field="${field}" min="${min}" max="${max}" value="${value}"></label>`; }

    rangeFields(min, max, minField = "min", maxField = "max") { return `<div class="inspector-field-row">${this.numberField("Minimum", min, min, max, minField)}${this.numberField("Maximum", max, min, max, maxField)}</div>`; }

    buttonModeField(mode) { return `<label class="inspector-field"><span>Button mode</span><select data-field="mode"><option value="momentary" ${mode === "momentary" ? "selected" : ""}>Momentary</option><option value="toggle" ${mode === "toggle" ? "selected" : ""}>Toggle</option></select></label>`; }

    renderLedInspector(component) {
        const cfg = this.model.getComponentConfiguration(component.id) ?? {};
        const led = cfg.led ?? {};
        const rgb = led.color ?? this.rgb;
        const brightness = Number(led.brightness ?? this.brightness);
        const mode = led.mode ?? "static";
        return `
            <style>
                .led-color-editor{display:grid;grid-template-columns:190px minmax(0,1fr);gap:18px;align-items:center;margin:4px 0 18px}
                .led-color-wheel{position:relative;width:178px;height:178px;border-radius:50%;cursor:crosshair;touch-action:none;background:radial-gradient(circle at 50% 50%,#fff 0%,rgba(255,255,255,0) 68%),conic-gradient(#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000);box-shadow:inset 0 0 0 1px rgba(0,0,0,.28),0 2px 8px rgba(0,0,0,.12)}
                .led-color-wheel::after{content:"";position:absolute;inset:8px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.38),inset 0 0 18px rgba(0,0,0,.08);pointer-events:none}
                .led-color-wheel__marker{position:absolute;width:14px;height:14px;border:2px solid #fff;border-radius:50%;transform:translate(-50%,-50%);left:50%;top:50%;box-sizing:border-box;box-shadow:0 0 0 1px rgba(0,0,0,.7),0 1px 3px rgba(0,0,0,.35);pointer-events:none}
                .led-color-wheel__center{position:absolute;left:50%;top:50%;width:34px;height:34px;border-radius:50%;transform:translate(-50%,-50%);border:2px solid rgba(255,255,255,.8);box-shadow:0 0 0 1px rgba(0,0,0,.55);pointer-events:none}
                .led-color-readout{display:grid;gap:8px;min-width:0}.led-color-readout__label{font:700 8px/1 monospace;letter-spacing:.12em;color:var(--color-text-muted);text-transform:uppercase}.led-color-readout__value{height:38px;padding:0 10px;display:flex;align-items:center;border:1px solid var(--color-border);background:var(--color-surface);font:700 12px/1 monospace;letter-spacing:.08em;box-sizing:border-box}
                @media(max-width:760px){.led-color-editor{grid-template-columns:150px minmax(0,1fr);gap:12px}.led-color-wheel{width:145px;height:145px}}
            </style>
            <div class="inspector-panel inspector-panel--led">
                <div class="inspector-panel__header"><span class="section-label">LED CONFIGURATION</span><h2>${component.label} · LED</h2></div>
                <div class="led-color-editor">
                    <div class="led-color-wheel" data-color-wheel aria-label="RGB color wheel" role="slider" tabindex="0"><span class="led-color-wheel__marker" data-color-wheel-marker></span><span class="led-color-wheel__center" data-color-wheel-center></span></div>
                    <div class="led-color-readout"><span class="led-color-readout__label">Selected color</span><span class="led-color-readout__value" data-color-hex>${this.rgbToHex(rgb)}</span><div class="rgb-fields">${this.numberField("R", rgb.r, 0, 255, "r")}${this.numberField("G", rgb.g, 0, 255, "g")}${this.numberField("B", rgb.b, 0, 255, "b")}</div></div>
                </div>
                <div class="led-preview" style="--led-r:${rgb.r};--led-g:${rgb.g};--led-b:${rgb.b};--led-a:${brightness / 100}"><span></span></div>
                <div class="inspector-group">
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
        const updateWheelUI = color => {
            const wheel = this.element.querySelector("[data-color-wheel]");
            const marker = this.element.querySelector("[data-color-wheel-marker]");
            const center = this.element.querySelector("[data-color-wheel-center]");
            const hex = this.element.querySelector("[data-color-hex]");
            if (!wheel) return;
            const hsv = this.rgbToHsv(color);
            const angle = hsv.h * Math.PI / 180;
            const x = 50 + Math.cos(angle) * 50 * hsv.s;
            const y = 50 + Math.sin(angle) * 50 * hsv.s;
            if (marker) { marker.style.left = `${x}%`; marker.style.top = `${y}%`; }
            if (center) center.style.background = `rgb(${color.r},${color.g},${color.b})`;
            if (hex) hex.textContent = this.rgbToHex(color);
        };
        const applyColor = color => {
            this.rgb = { r: Math.round(color.r), g: Math.round(color.g), b: Math.round(color.b) };
            update({ color: this.rgb });
            this.element.querySelectorAll('[data-field="r"],[data-field="g"],[data-field="b"]').forEach(input => { input.value = this.rgb[input.dataset.field]; });
            const preview = this.element.querySelector(".led-preview");
            if (preview) { preview.style.setProperty("--led-r", this.rgb.r); preview.style.setProperty("--led-g", this.rgb.g); preview.style.setProperty("--led-b", this.rgb.b); }
            updateWheelUI(this.rgb);
        };

        this.element.querySelectorAll('[data-field="r"],[data-field="g"],[data-field="b"]').forEach(input => input.addEventListener("change", () => applyColor({ ...this.rgb, [input.dataset.field]: Math.max(0, Math.min(255, Number(input.value) || 0)) })));

        const wheel = this.element.querySelector("[data-color-wheel]");
        const updateFromPointer = event => {
            const rect = wheel.getBoundingClientRect();
            const dx = event.clientX - (rect.left + rect.width / 2);
            const dy = event.clientY - (rect.top + rect.height / 2);
            const radius = Math.min(rect.width, rect.height) / 2;
            const distance = Math.min(radius, Math.hypot(dx, dy));
            const saturation = distance / radius;
            const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
            applyColor(this.hsvToRgb(hue, saturation, 1));
        };
        wheel?.addEventListener("pointerdown", event => { wheel.setPointerCapture?.(event.pointerId); updateFromPointer(event); });
        wheel?.addEventListener("pointermove", event => { if (event.buttons & 1) updateFromPointer(event); });
        wheel?.addEventListener("keydown", event => {
            if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
            event.preventDefault();
            const hsv = this.rgbToHsv(this.rgb);
            if (event.key === "ArrowLeft") hsv.h = (hsv.h - 2 + 360) % 360;
            if (event.key === "ArrowRight") hsv.h = (hsv.h + 2) % 360;
            if (event.key === "ArrowUp") hsv.s = Math.min(1, hsv.s + .02);
            if (event.key === "ArrowDown") hsv.s = Math.max(0, hsv.s - .02);
            applyColor(this.hsvToRgb(hsv.h, hsv.s, hsv.v));
        });

        const brightness = this.element.querySelector('[data-field="brightness"]');
        brightness?.addEventListener("input", () => {
            this.brightness = Number(brightness.value);
            const output = this.element.querySelector("[data-brightness-value]");
            if (output) output.textContent = `${this.brightness}%`;
            const preview = this.element.querySelector(".led-preview");
            if (preview) preview.style.setProperty("--led-a", this.brightness / 100);
            update({ brightness: this.brightness });
        });

        const mode = this.element.querySelector('[data-field="ledMode"]');
        mode?.addEventListener("change", () => update({ mode: mode.value }));
        updateWheelUI(this.rgb);
    }

    rgbToHex({ r, g, b }) { return `#${[r, g, b].map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("").toUpperCase()}`; }

    rgbToHsv({ r, g, b }) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        let h = 0;
        if (d) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
            if (h < 0) h += 360;
        }
        return { h, s: max ? d / max : 0, v: max };
    }

    hsvToRgb(h, s, v) {
        const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
        let r = 0, g = 0, b = 0;
        if (h < 60) [r, g, b] = [c, x, 0];
        else if (h < 120) [r, g, b] = [x, c, 0];
        else if (h < 180) [r, g, b] = [0, c, x];
        else if (h < 240) [r, g, b] = [0, x, c];
        else if (h < 300) [r, g, b] = [x, 0, c];
        else [r, g, b] = [c, 0, x];
        return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
    }

    updateRuntimeDisplay() {
        const output = this.element.querySelector("[data-runtime-value]");
        if (output) output.textContent = this.runtimeValue;
    }
}