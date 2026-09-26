/**
 * Mock bipoCore device provider. Production bipoCore will identify the
 * physical device during the handshake; the selector is development-only.
 *
 * Configuration follows the same lifecycle we want from the future device:
 * edits are kept in memory until commit(), then the committed configuration
 * is persisted per mock device. Runtime is execution state and is not treated
 * as configuration.
 */
class BipoCore {
    constructor() {
        this.simulateLatency = true;
        this.mockDevices = this.createMockDevices();
        this.activeDeviceId = this.getStoredMockDeviceId() ?? "lab-16k";
        this.restorePersistedConfiguration();
        this.restorePersistedConnectivity();
    }

    async hello() {
        await this.delay(150);
        const d = this.getActiveDevice();
        return { id: d.id, name: d.name, firmware: "MOCK 1.0.0", protocol: "MOCK 1.0", hardware: d.hardware.hardwareRevision, capabilities: structuredClone(d.capabilities), connectivity: structuredClone(d.connectivity) };
    }

    async read(resource) {
        await this.delay();
        const d = this.getActiveDevice();
        if (resource === "/hardware") return d.hardware;
        if (resource === "/configuration") return d.configuration;
        if (resource === "/runtime") return d.runtime;
        if (resource === "/connectivity") return d.connectivity;
        throw new Error(`Unknown resource: ${resource}`);
    }

    async write(resource, data) {
        await this.delay(80);
        const d = this.getActiveDevice();

        if (resource === "/configuration") {
            // This is deliberately only staged in the active mock. Persistence
            // happens on commit(), matching the WorkingCopy lifecycle.
            d.configuration = structuredClone(data);
        } else if (resource === "/runtime") {
            d.runtime = structuredClone(data);
        } else if (resource === "/connectivity") {
            d.connectivity = { ...d.connectivity, ...structuredClone(data) };
        } else {
            throw new Error(`Unknown writable resource: ${resource}`);
        }

        console.log("MOCK WRITE", resource, data);
    }

    async commit() {
        await this.delay(60);
        this.persistCommittedConfiguration();
        this.persistConnectivity();
        console.log("MOCK COMMIT");
    }

    async readConnectivity() {
        await this.delay(40);
        return structuredClone(this.getActiveDevice().connectivity);
    }

    async setBluetoothEnabled(enabled) {
        await this.delay(60);
        const d = this.getActiveDevice();
        d.connectivity.bluetooth.enabled = Boolean(enabled);
        d.connectivity.bluetooth.status = d.connectivity.bluetooth.enabled ? "advertising" : "off";
        this.persistConnectivity();
        return structuredClone(d.connectivity.bluetooth);
    }

    async setMidiOutputEnabled(output, enabled) {
        await this.delay(40);
        const d = this.getActiveDevice();
        if (!["usb", "bluetooth"].includes(output)) throw new Error(`Unknown MIDI output: ${output}`);
        d.connectivity.midiOutputs[output] = Boolean(enabled);
        this.persistConnectivity();
        return structuredClone(d.connectivity);
    }

    async setBluetoothName(name) {
        await this.delay(60);
        const d = this.getActiveDevice();
        const normalized = String(name ?? "").trim().slice(0, 32);
        if (normalized) d.connectivity.bluetooth.name = normalized;
        this.persistConnectivity();
        return structuredClone(d.connectivity.bluetooth);
    }

    persistConnectivity() {
        try {
            const d = this.getActiveDevice();
            window.localStorage.setItem(`bipoStudio.mockConnectivity.${d.id}`, JSON.stringify(d.connectivity));
        } catch {}
    }

    restorePersistedConnectivity() {
        try {
            const d = this.getActiveDevice();
            const raw = window.localStorage.getItem(`bipoStudio.mockConnectivity.${d.id}`);
            if (raw) d.connectivity = { ...d.connectivity, ...JSON.parse(raw) };
        } catch {}
    }

    setMockDevice(id) {
        if (!this.mockDevices[id]) throw new Error(`Unknown mock device: ${id}`);
        this.activeDeviceId = id;
        this.storeMockDeviceId(id);
        this.restorePersistedConfiguration();
        this.restorePersistedConnectivity();
    }

    getMockDevices() {
        return Object.values(this.mockDevices).map(({ id, name, description }) => ({ id, name, description }));
    }

    getActiveDevice() {
        return this.mockDevices[this.activeDeviceId];
    }

    getStoredMockDeviceId() {
        try {
            const id = window.localStorage.getItem("bipoStudio.mockDevice");
            return this.mockDevices[id] ? id : null;
        } catch {
            return null;
        }
    }

    storeMockDeviceId(id) {
        try {
            window.localStorage.setItem("bipoStudio.mockDevice", id);
        } catch {}
    }

    persistCommittedConfiguration() {
        try {
            const d = this.getActiveDevice();
            window.localStorage.setItem(
                `bipoStudio.mockConfiguration.${d.id}`,
                JSON.stringify(d.configuration)
            );
        } catch {}
    }

    restorePersistedConfiguration() {
        try {
            const d = this.getActiveDevice();
            const raw = window.localStorage.getItem(`bipoStudio.mockConfiguration.${d.id}`);
            if (!raw) return;

            const configuration = JSON.parse(raw);
            if (configuration && typeof configuration === "object") {
                d.configuration = configuration;
            }
        } catch {}
    }

    createMockDevices() {
        return {
            "lab-16k": createKnobDevice(16),
            "lab-16b": createButtonDevice(16),
            "lab-4f": createFaderDevice(4),
            "lab-16d": createDrumTriggerDevice(16)
        };
    }

    async delay(time = null) {
        if (!this.simulateLatency) return;
        return new Promise(resolve => setTimeout(resolve, time ?? (80 + Math.floor(Math.random() * 120))));
    }
}

function createKnobDevice(count) {
    const components = [], configuration = {}, runtime = {};
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 4), col = i % 4, id = `K${String(i + 1).padStart(3, "0")}`;
        components.push({
            id,
            label: `Knob ${i + 1}`,
            type: "knob",
            position: { x: 58 + col * 110, y: 35 + row * 45 },
            led: { type: "rgb", id: `L${String(i + 1).padStart(3, "0")}`, configurable: true }
        });
        configuration[id] = {
            messageType: "cc",
            channel: 1,
            number: 20 + i,
            resolution: 10,
            min: 0,
            max: 1023,
            led: { mode: "static", color: { r: 255, g: 255, b: 255 }, brightness: 100 }
        };
        runtime[id] = 0;
    }
    return createDevice("lab-16k", "LAB-16K", "16 knobs · 4 × 4 matrix · RGB LED per control", components, configuration, runtime);
}

function createButtonDevice(count) {
    const components = [], configuration = {}, runtime = {};
    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 4), col = i % 4, id = `B${String(i + 1).padStart(3, "0")}`;
        components.push({
            id,
            label: `Button ${i + 1}`,
            type: "button",
            position: { x: 58 + col * 110, y: 35 + row * 45 },
            led: { type: "rgb", id: `L${String(i + 1).padStart(3, "0")}`, configurable: true }
        });
        configuration[id] = {
            messageType: "note",
            channel: 1,
            number: 60 + i,
            mode: "momentary",
            led: { mode: "static", color: { r: 255, g: 255, b: 255 }, brightness: 100 }
        };
        runtime[id] = 0;
    }
    return createDevice("lab-16b", "LAB-16B", "16 buttons · 4 × 4 matrix · RGB LED per control", components, configuration, runtime);
}

function createFaderDevice(count) {
    const components = [], configuration = {}, runtime = {};
    for (let i = 0; i < count; i++) {
        const id = `F${String(i + 1).padStart(3, "0")}`;
        components.push({
            id,
            label: `Fader ${i + 1}`,
            type: "fader",
            position: { x: 55 + i * 110, y: 80 },
            led: { type: "rgb", id: `L${String(i + 1).padStart(3, "0")}`, configurable: true }
        });
        configuration[id] = {
            messageType: "cc",
            channel: 1,
            number: 21 + i,
            resolution: 10,
            min: 0,
            max: 1023,
            led: { mode: "static", color: { r: 255, g: 255, b: 255 }, brightness: 100 }
        };
        runtime[id] = 0;
    }
    return createDevice("lab-4f", "LAB-4F", "4 faders · RGB LED per control", components, configuration, runtime);
}


function createDrumTriggerDevice(count) {
    const components = [], configuration = {}, runtime = {};
    const padNames = [
        "Kick", "Snare", "Hi-Hat", "Tom 1",
        "Tom 2", "Tom 3", "Crash 1", "Crash 2",
        "Ride", "China", "Splash", "Aux 1",
        "Aux 2", "Aux 3", "Aux 4", "Aux 5"
    ];

    for (let i = 0; i < count; i++) {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const id = `T${String(i + 1).padStart(3, "0")}`;

        components.push({
            id,
            label: `Trigger ${i + 1}`,
            type: "trigger",
            position: { x: 50 + col * 116, y: 28 + row * 82 },
            metadata: {
                input: i + 1,
                defaultName: padNames[i] ?? `Input ${i + 1}`,
                sensor: "analog"
            },
            led: {
                type: "rgb",
                id: `L${String(i + 1).padStart(3, "0")}`,
                configurable: true
            }
        });

        configuration[id] = {
            messageType: "note",
            channel: 10,
            number: [36, 38, 42, 45, 48, 50, 49, 57, 51, 52, 55, 41, 43, 47, 46, 44][i] ?? 36,
            velocity: 127,
            resolution: 10,
            curve: "linear",
            threshold: 12,
            sensitivity: 80,
            minVelocity: 1,
            maxVelocity: 127,
            retriggerMs: 80,
            scanTimeMs: 4,
            crossTalk: 0,
            invert: false,
            led: {
                mode: "runtime",
                color: { r: 255, g: 255, b: 255 },
                brightness: 100
            }
        };

        runtime[id] = 0;
    }

    return createDevice(
        "lab-16d",
        "LAB-16D",
        "16 analog drum trigger inputs · 4 × 4 rack · RGB LED per input",
        components,
        configuration,
        runtime,
        {
            trigger: {
                inputs: count,
                sensorType: "analog",
                resolutions: [7, 10, 12, 14],
                curves: ["linear", "soft", "hard", "log", "exp"]
            }
        }
    );
}

function createDevice(id, name, description, components, configuration, runtime, extraCapabilities = {}) {
    return {
        id,
        name,
        description,
        hardware: {
            id,
            name,
            vendor: "bipoLab engineering",
            hardwareRevision: "MOCK",
            components,
            connectors: []
        },
        configuration,
        runtime,
        capabilities: {
            midi: { usb: true, bluetooth: true, virtual: true },
            bluetooth: { midi: true, rename: true, power: true },
            configuration: { presets: true, importExport: true, snapshots: true, undoRedo: true },
            controls: components.map(component => component.type),
            ...extraCapabilities
        },
        connectivity: {
            usb: { enabled: true, status: "connected" },
            midiOutputs: { usb: true, bluetooth: true },
            bluetooth: { enabled: true, status: "advertising", name, connections: 0, midiEnabled: true }
        }
    };
}

export default new BipoCore();
