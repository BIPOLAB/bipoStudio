import bipoCore from "../core/bipoCore.js";
import { Events } from "../core/Events.js";
import Hardware from "./Hardware.js";
import Configuration from "./Configuration.js";
import Runtime from "./Runtime.js";
import WorkingCopy from "./WorkingCopy.js";

export default class DeviceModel {
    constructor(eventBus, core = bipoCore) {
        this.eventBus = eventBus;
        this.core = core;
        this.identity = null;
        this.hardware = null;
        this.configuration = null;
        this.runtime = null;
        this.workingCopy = null;
        this.workingCopyDrafts = new Map();
        this.eventBus.on?.("transport:message", this.onTransportMessage.bind(this));
    }

    get device() { return this.identity; }

    async load() {
        const previousDeviceId = this.identity?.id;
        if (previousDeviceId && this.workingCopy) {
            this.workingCopyDrafts.set(previousDeviceId, this.workingCopy.toJSON());
        }

        this.eventBus.emit(Events.DEVICE_CONNECTING);
        this.identity = Object.freeze({ ...(await this.core.hello()) });
        this.eventBus.emit(Events.DEVICE_CONNECTED, this.identity);
        this.eventBus.emit(Events.DEVICE_LOADING_HARDWARE);
        this.hardware = new Hardware(await this.core.read("/hardware"));
        this.eventBus.emit(Events.DEVICE_HARDWARE_LOADED, this.hardware);
        this.eventBus.emit(Events.DEVICE_LOADING_CONFIGURATION);
        this.configuration = new Configuration(await this.core.read("/configuration"), this.hardware);
        this.eventBus.emit(Events.DEVICE_CONFIGURATION_LOADED, this.configuration);
        this.eventBus.emit(Events.DEVICE_LOADING_RUNTIME);
        this.runtime = new Runtime(await this.core.read("/runtime"), this.hardware);
        this.connectivity = structuredClone(await this.core.read("/connectivity"));
        this.eventBus.emit(Events.DEVICE_RUNTIME_LOADED, this.runtime);
        this.eventBus.emit(Events.CONNECTIVITY_CHANGED, this.connectivity);

        this.workingCopy = new WorkingCopy(this.configuration);
        const draft = this.workingCopyDrafts.get(this.identity.id);
        if (draft) this.workingCopy.restoreDraft(draft);

        this.eventBus.emit(Events.DEVICE_MODEL_READY, this);
        this.eventBus.emit(Events.SESSION_CHANGED, this.identity);
        this.eventBus.emit(Events.WORKING_COPY_CHANGED, {
            componentId: null,
            configuration: null,
            dirty: this.workingCopy.isDirty()
        });
        return this;
    }

    getComponent(componentId) { return this.hardware?.getComponent(componentId) ?? null; }
    getComponentConfiguration(componentId) { return this.workingCopy?.get(componentId) ?? null; }
    getComponentRuntime(componentId) { return this.runtime?.get(componentId) ?? null; }

    getConnectivity() { return structuredClone(this.connectivity ?? {}); }

    async setBluetoothEnabled(enabled) {
        if (!this.connectivity?.bluetooth) return false;
        try {
            const bluetooth = await this.core.setBluetoothEnabled(Boolean(enabled));
            this.connectivity = { ...this.connectivity, bluetooth };
            this.eventBus.emit(Events.CONNECTIVITY_CHANGED, this.getConnectivity());
            return true;
        } catch (error) {
            this.eventBus.emit(Events.CONFIGURATION_ERROR, error);
            return false;
        }
    }

    async setBluetoothName(name) {
        if (!this.connectivity?.bluetooth) return false;
        try {
            const bluetooth = await this.core.setBluetoothName(name);
            this.connectivity = { ...this.connectivity, bluetooth };
            this.eventBus.emit(Events.CONNECTIVITY_CHANGED, this.getConnectivity());
            return true;
        } catch (error) {
            this.eventBus.emit(Events.CONFIGURATION_ERROR, error);
            return false;
        }
    }

    updateComponentConfiguration(componentId, patch) {
        if (!this.workingCopy || !this.getComponent(componentId)) return false;
        const current = this.workingCopy.get(componentId) ?? {};
        if (!this.workingCopy.set(componentId, { ...current, ...patch })) return true;
        this.syncWorkingCopyDraft();
        this.emitWorkingCopyChanged(componentId);
        return true;
    }

    undoWorkingCopy() {
        if (!this.workingCopy?.undo()) return false;
        this.syncWorkingCopyDraft();
        this.emitWorkingCopyChanged();
        return true;
    }

    redoWorkingCopy() {
        if (!this.workingCopy?.redo()) return false;
        this.syncWorkingCopyDraft();
        this.emitWorkingCopyChanged();
        return true;
    }

    canUndo() { return Boolean(this.workingCopy?.canUndo()); }
    canRedo() { return Boolean(this.workingCopy?.canRedo()); }

    createSnapshot() { return this.workingCopy?.snapshot() ?? null; }

    restoreSnapshot(snapshot) {
        if (!this.workingCopy?.restoreSnapshot(snapshot)) return false;
        this.syncWorkingCopyDraft();
        this.emitWorkingCopyChanged();
        return true;
    }

    exportConfiguration() {
        return {
            format: "bipoStudio.configuration",
            version: 1,
            device: this.device?.id ?? null,
            model: this.device?.name ?? null,
            exportedAt: new Date().toISOString(),
            configuration: this.workingCopy?.toJSON() ?? {}
        };
    }

    importConfiguration(payload) {
        const values = payload?.configuration ?? payload;
        if (!values || typeof values !== "object") return false;
        const componentIds = new Set(this.hardware?.components?.map(component => component.id) ?? []);
        const filtered = Object.fromEntries(Object.entries(values).filter(([id]) => componentIds.has(id)));
        if (!Object.keys(filtered).length) return false;
        this.workingCopy.restoreDraft({ ...this.workingCopy.toJSON(), ...filtered });
        this.syncWorkingCopyDraft();
        this.emitWorkingCopyChanged();
        return true;
    }

    listPresets() {
        try {
            return JSON.parse(window.localStorage.getItem(`bipoStudio.presets.${this.device?.id}`) ?? "[]");
        } catch { return []; }
    }

    savePreset(name) {
        const normalized = String(name ?? "").trim().slice(0, 40);
        if (!normalized || !this.workingCopy) return false;
        const presets = this.listPresets().filter(preset => preset.name !== normalized);
        presets.push({ name: normalized, savedAt: new Date().toISOString(), configuration: this.workingCopy.toJSON() });
        try {
            window.localStorage.setItem(`bipoStudio.presets.${this.device?.id}`, JSON.stringify(presets.slice(-20)));
            return true;
        } catch { return false; }
    }

    loadPreset(name) {
        const preset = this.listPresets().find(item => item.name === name);
        if (!preset) return false;
        return this.importConfiguration(preset.configuration);
    }

    deletePreset(name) {
        const presets = this.listPresets().filter(item => item.name !== name);
        try {
            window.localStorage.setItem(`bipoStudio.presets.${this.device?.id}`, JSON.stringify(presets));
            return true;
        } catch { return false; }
    }
    validateConfiguration() {
        const issues = [];
        const seen = new Map();
        for (const component of this.hardware?.components ?? []) {
            const cfg = this.getComponentConfiguration(component.id) ?? {};
            const channel = Number(cfg.channel ?? 1);
            if (channel < 1 || channel > 16) issues.push({ id: component.id, severity: "error", message: "MIDI channel must be 1–16." });
            const number = Number(cfg.number ?? 0);
            if (["cc", "note", "program"].includes(cfg.messageType) && (number < 0 || number > 127)) issues.push({ id: component.id, severity: "error", message: "MIDI number must be 0–127." });
            const key = `${cfg.messageType ?? "cc"}:${channel}:${number}`;
            if (seen.has(key)) issues.push({ id: component.id, severity: "warning", message: `Duplicate MIDI mapping with ${seen.get(key)}.` });
            else seen.set(key, component.id);
            if (cfg.min != null && cfg.max != null && Number(cfg.min) > Number(cfg.max)) issues.push({ id: component.id, severity: "error", message: "Minimum cannot exceed maximum." });
        }
        return issues;
    }

    syncWorkingCopyDraft() {
        if (this.device?.id && this.workingCopy) this.workingCopyDrafts.set(this.device.id, this.workingCopy.toJSON());
    }

    emitWorkingCopyChanged(componentId = null) {
        this.eventBus.emit(Events.WORKING_COPY_CHANGED, {
            componentId,
            configuration: componentId ? this.workingCopy.get(componentId) : null,
            dirty: this.workingCopy.isDirty(),
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        });
    }

    resetWorkingCopy() {
        if (!this.workingCopy) return;
        this.workingCopy.reset();
        this.syncWorkingCopyDraft();
        this.emitWorkingCopyChanged();
    }

    async commitConfiguration() {
        if (!this.workingCopy || !this.workingCopy.isDirty()) return false;
        try {
            await this.core.write("/configuration", this.workingCopy.toJSON());
            await this.core.commit();
            this.workingCopy.markCommitted();
            this.workingCopyDrafts.set(this.device.id, this.workingCopy.toJSON());
            this.eventBus.emit(Events.CONFIGURATION_COMMITTED);
            this.eventBus.emit(Events.WORKING_COPY_CHANGED, { componentId: null, configuration: null, dirty: false });
            return true;
        } catch (error) {
            this.eventBus.emit(Events.CONFIGURATION_ERROR, error);
            return false;
        }
    }

    setRuntimeValue(componentId, value) {
        if (!this.runtime || !this.getComponent(componentId)) return false;
        const normalized = Math.round(Math.min(127, Math.max(0, Number(value) || 0)));
        this.runtime.set(componentId, normalized);
        this.eventBus.emit(Events.RUNTIME_CHANGED, { componentId, value: normalized });
        this.emitMidiMessage(componentId, normalized);
        return true;
    }

    emitMidiMessage(componentId, value) {
        const configuration = this.getComponentConfiguration(componentId);
        if (!configuration) return;

        const type = configuration.messageType ?? "cc";
        const channel = clamp(Number(configuration.channel ?? 1), 1, 16);
        const channelIndex = channel - 1;
        const normalized = clamp(Number(value), 0, 127);
        const messages = this.buildMidiMessages(type, configuration, normalized, channelIndex);
        if (!messages.length) return;

        const primary = messages[0];
        this.eventBus.emit(Events.MIDI_MESSAGE, {
            componentId,
            type,
            channel,
            number: configuration.number ?? configuration.parameterLsb ?? null,
            value: normalized,
            status: primary.status,
            data1: primary.data1 ?? null,
            data2: primary.data2 ?? null,
            messages,
            timestamp: Date.now()
        });
    }

    buildMidiMessages(type, configuration, value, channelIndex) {
        switch (type) {
            case "cc": {
                const number = clamp(Number(configuration.number ?? 0), 0, 127);
                return [{ status: 0xB0 | channelIndex, data1: number, data2: this.mapRange(value, configuration.min, configuration.max) }];
            }

            case "note": {
                const note = clamp(Number(configuration.number ?? 60), 0, 127);
                const velocity = clamp(Number(configuration.velocity ?? 127), 0, 127);
                const status = value > 0 ? 0x90 : 0x80;
                return [{ status: status | channelIndex, data1: note, data2: value > 0 ? velocity : 0 }];
            }

            case "program": {
                const program = clamp(Number(configuration.number ?? 0), 0, 127);
                const messages = [];
                const bankMsb = clamp(Number(configuration.bankMsb ?? 0), 0, 127);
                const bankLsb = clamp(Number(configuration.bankLsb ?? 0), 0, 127);
                if (bankMsb || bankLsb) {
                    messages.push({ status: 0xB0 | channelIndex, data1: 0, data2: bankMsb });
                    messages.push({ status: 0xB0 | channelIndex, data1: 32, data2: bankLsb });
                }
                messages.push({ status: 0xC0 | channelIndex, data1: program });
                return messages;
            }

            case "nrpn":
            case "rpn": {
                const parameterMsb = clamp(Number(configuration.parameterMsb ?? 0), 0, 127);
                const parameterLsb = clamp(Number(configuration.parameterLsb ?? 0), 0, 127);
                const parameterController = type === "nrpn" ? 99 : 101;
                const parameterControllerLsb = type === "nrpn" ? 98 : 100;
                const data = this.mapRange(value, configuration.min, configuration.max);
                const dataMsb = Math.floor(data / 128);
                const dataLsb = data % 128;
                return [
                    { status: 0xB0 | channelIndex, data1: parameterController, data2: parameterMsb },
                    { status: 0xB0 | channelIndex, data1: parameterControllerLsb, data2: parameterLsb },
                    { status: 0xB0 | channelIndex, data1: 6, data2: dataMsb },
                    { status: 0xB0 | channelIndex, data1: 38, data2: dataLsb }
                ];
            }

            case "pitchbend": {
                const min = Number(configuration.bendMin ?? -8192);
                const max = Number(configuration.bendMax ?? 8191);
                const bend = Math.round(min + (max - min) * (value / 127));
                const raw = clamp(bend + 8192, 0, 16383);
                return [{ status: 0xE0 | channelIndex, data1: raw & 0x7F, data2: (raw >> 7) & 0x7F }];
            }

            case "aftertouch": {
                const aftertouch = this.mapRange(value, configuration.min, configuration.max);
                return [{ status: 0xD0 | channelIndex, data1: aftertouch }];
            }

            case "mmc":
                return [{ status: 0xF0, data1: 0x7F, data2: 0x7F, sysex: [0xF0, 0x7F, 0x7F, 0x06, this.mmcCommand(configuration.mmcCommand), 0xF7] }];

            default:
                return [];
        }
    }

    mapRange(value, min = 0, max = 127) {
        const low = Number(min ?? 0);
        const high = Number(max ?? 127);
        if (high === low) return clamp(Math.round(low), 0, 127);
        return clamp(Math.round(low + (high - low) * (value / 127)), 0, 127);
    }

    mmcCommand(command) {
        return ({
            "stop": 0x01,
            "play": 0x02,
            "deferred-play": 0x03,
            "fast-forward": 0x04,
            "rewind": 0x05,
            "record-punch-in": 0x06,
            "record-punch-out": 0x07,
            "pause": 0x09
        })[command] ?? 0x01;
    }

    onTransportMessage(message) { console.debug("[DeviceModel] transport:", message); }
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
