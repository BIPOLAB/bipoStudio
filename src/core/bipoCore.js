/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : bipoCore.js
 * Version : 0.5.1
 * Sprint  : 07
 *
 * Mock device provider for bipoStudio.
 * --------------------------------------------------------------------
 */

class BipoCore {
    constructor() {
        this.simulateLatency = true;
        this.mockDevices = this.createMockDevices();
        this.activeDeviceId = "lab-16k";
    }

    async hello() {
        await this.delay(150);
        const device = this.getActiveDevice();
        return { id: device.id, name: device.name, firmware: "MOCK 1.0.0", protocol: "MOCK 1.0" };
    }

    async read(resource) {
        await this.delay();
        const device = this.getActiveDevice();
        switch (resource) {
            case "/hardware": return device.hardware;
            case "/configuration": return device.configuration;
            case "/runtime": return device.runtime;
            default: throw new Error(`Unknown resource: ${resource}`);
        }
    }

    async write(resource, data) {
        await this.delay(80);
        console.log("MOCK WRITE", resource, data);
    }

    async commit() {
        await this.delay(60);
        console.log("MOCK COMMIT");
    }

    setMockDevice(deviceId) {
        if (!this.mockDevices[deviceId]) throw new Error(`Unknown mock device: ${deviceId}`);
        this.activeDeviceId = deviceId;
    }

    getMockDevices() {
        return Object.values(this.mockDevices).map(({ id, name, description }) => ({ id, name, description }));
    }

    getActiveDevice() { return this.mockDevices[this.activeDeviceId]; }

    createMockDevices() {
        return {
            "lab-16k": createKnobDevice(16),
            "lab-16b": createButtonDevice(16),
            "lab-4f": createFaderDevice(4)
        };
    }

    async delay(time = null) {
        if (!this.simulateLatency) return;
        const milliseconds = time ?? (80 + Math.floor(Math.random() * 120));
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }
}

function createKnobDevice(count) {
    const components = [];
    const configuration = {};
    const runtime = {};
    for (let index = 0; index < count; index++) {
        const row = Math.floor(index / 4);
        const column = index % 4;
        const id = `K${String(index + 1).padStart(3, "0")}`;
        components.push({ id, label: `Knob ${index + 1}`, type: "knob", position: { x: 70 + column * 100, y: 38 + row * 42 } });
        configuration[id] = { messageType: "cc", channel: 1, number: 20 + index };
        runtime[id] = 0;
    }
    return createDevice("lab-16k", "LAB-16K", "16 knobs · 4 × 4 matrix", components, configuration, runtime);
}

function createButtonDevice(count) {
    const components = [];
    const configuration = {};
    const runtime = {};
    for (let index = 0; index < count; index++) {
        const row = Math.floor(index / 4);
        const column = index % 4;
        const id = `B${String(index + 1).padStart(3, "0")}`;
        components.push({ id, label: `Button ${index + 1}`, type: "button", position: { x: 70 + column * 100, y: 38 + row * 42 } });
        configuration[id] = { messageType: "note", channel: 1, number: 60 + index, mode: "momentary" };
        runtime[id] = 0;
    }
    return createDevice("lab-16b", "LAB-16B", "16 buttons · 4 × 4 matrix", components, configuration, runtime);
}

function createFaderDevice(count) {
    const components = [];
    const configuration = {};
    const runtime = {};
    for (let index = 0; index < count; index++) {
        const id = `F${String(index + 1).padStart(3, "0")}`;
        components.push({ id, label: `Fader ${index + 1}`, type: "fader", position: { x: 70 + index * 100, y: 65 } });
        configuration[id] = { messageType: "cc", channel: 1, number: 21 + index };
        runtime[id] = 0;
    }
    return createDevice("lab-4f", "LAB-4F", "4 faders", components, configuration, runtime);
}

function createDevice(id, name, description, components, configuration, runtime) {
    return {
        id,
        name,
        description,
        hardware: { id, name, vendor: "bipoLab engineering", hardwareRevision: "MOCK", components, connectors: [] },
        configuration,
        runtime
    };
}

const bipoCore = new BipoCore();
export default bipoCore;
