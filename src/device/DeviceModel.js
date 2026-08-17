import bipoCore from "../core/bipoCore.js";
import { Events } from "../core/Events.js";
import Hardware from "./Hardware.js";
import Configuration from "./Configuration.js";
import Runtime from "./Runtime.js";
import WorkingCopy from "./WorkingCopy.js";

/**
 * Aggregate root for one device loaded in bipoStudio.
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

        // Reservado para el futuro Bridge/Transport.
        this.eventBus.on?.(
            "transport:message",
            this.onTransportMessage.bind(this)
        );

    }

    get device() {
        return this.identity;
    }

    async load() {

        this.eventBus.emit(Events.DEVICE_CONNECTING);

        this.identity = Object.freeze({
            ...(await this.core.hello())
        });

        this.eventBus.emit(
            Events.DEVICE_CONNECTED,
            this.identity
        );

        this.eventBus.emit(
            Events.DEVICE_LOADING_HARDWARE
        );

        this.hardware = new Hardware(
            await this.core.read("/hardware")
        );

        this.eventBus.emit(
            Events.DEVICE_HARDWARE_LOADED,
            this.hardware
        );

        this.eventBus.emit(
            Events.DEVICE_LOADING_CONFIGURATION
        );

        this.configuration = new Configuration(
            await this.core.read("/configuration"),
            this.hardware
        );

        this.eventBus.emit(
            Events.DEVICE_CONFIGURATION_LOADED,
            this.configuration
        );

        this.eventBus.emit(
            Events.DEVICE_LOADING_RUNTIME
        );

        this.runtime = new Runtime(
            await this.core.read("/runtime"),
            this.hardware
        );

        this.eventBus.emit(
            Events.DEVICE_RUNTIME_LOADED,
            this.runtime
        );

        this.workingCopy = new WorkingCopy(
            this.configuration
        );

        this.eventBus.emit(
            Events.DEVICE_MODEL_READY,
            this
        );

        this.eventBus.emit(
            Events.SESSION_CHANGED,
            this.identity
        );

        return this;

    }

    getComponent(componentId) {

        return this.hardware?.getComponent(componentId) ?? null;

    }

    getComponentConfiguration(componentId) {

        return this.workingCopy?.get(componentId) ?? null;

    }

    getComponentRuntime(componentId) {

        return this.runtime?.get(componentId) ?? null;

    }

    onTransportMessage(message) {

        // Placeholder para la futura integración con Bridge.
        // Por ahora no altera el flujo actual basado en bipoCore.

        console.debug(
            "[DeviceModel] transport:",
            message
        );

    }

}