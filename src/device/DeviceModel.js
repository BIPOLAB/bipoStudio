import bipoCore from "../core/bipoCore.js";
import { Events } from "../core/Events.js";
import Hardware from "./Hardware.js";
import Configuration from "./Configuration.js";
import Runtime from "./Runtime.js";
import WorkingCopy from "./WorkingCopy.js";

/**
 * Aggregate root for one device loaded in bipoStudio.
 * The current bipoCore implementation is a device mock.
 */
export default class DeviceModel {

    constructor(eventBus, core = bipoCore) {
        this.eventBus = eventBus;
        this.core = core;

        this.identity = null;
        this.hardware = null;
        this.configuration = null;
        this.runtime = null;
        this.workingCopy = null;

        this.eventBus.on?.("transport:message", this.onTransportMessage.bind(this));
    }

    get device() { return this.identity; }

    async load() {
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
        this.eventBus.emit(Events.DEVICE_RUNTIME_LOADED, this.runtime);
        this.workingCopy = new WorkingCopy(this.configuration);
        this.eventBus.emit(Events.DEVICE_MODEL_READY, this);
        this.eventBus.emit(Events.SESSION_CHANGED, this.identity);
        return this;
    }

    getComponent(componentId) { return this.hardware?.getComponent(componentId) ?? null; }
    getComponentConfiguration(componentId) { return this.workingCopy?.get(componentId) ?? null; }
    getComponentRuntime(componentId) { return this.runtime?.get(componentId) ?? null; }

    updateComponentConfiguration(componentId, patch) {
        if (!this.workingCopy || !this.getComponent(componentId)) return false;
        const current = this.workingCopy.get(componentId) ?? {};
        this.workingCopy.set(componentId, { ...current, ...patch });
        this.eventBus.emit(Events.WORKING_COPY_CHANGED, {
            componentId,
            configuration: this.workingCopy.get(componentId),
            dirty: this.workingCopy.isDirty()
        });
        return true;
    }

    resetWorkingCopy() {
        if (!this.workingCopy) return;
        this.workingCopy.reset();
        this.eventBus.emit(Events.WORKING_COPY_CHANGED, { componentId: null, configuration: null, dirty: false });
    }

    async commitConfiguration() {
        if (!this.workingCopy || !this.workingCopy.isDirty()) return false;
        try {
            await this.core.write("/configuration", this.workingCopy.toJSON());
            await this.core.commit();
            this.workingCopy.markCommitted();
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

        const messageType = configuration.messageType ?? "cc";
        const channel = Math.min(16, Math.max(1, Number(configuration.channel) || 1));
        const number = Math.min(127, Math.max(0, Number(configuration.number) || 0));
        const status = messageType === "note" ? 0x90 : 0xB0;

        this.eventBus.emit(Events.MIDI_MESSAGE, {
            componentId,
            type: messageType,
            channel,
            number,
            value,
            status: status + channel - 1,
            timestamp: Date.now()
        });
    }

    onTransportMessage(message) { console.debug("[DeviceModel] transport:", message); }
}
