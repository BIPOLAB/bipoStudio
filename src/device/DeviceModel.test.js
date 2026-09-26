import { describe, expect, it } from "vitest";
import EventBus from "../core/EventBus.js";
import { Events } from "../core/Events.js";
import DeviceModel from "./DeviceModel.js";

function createTriggerCore(configuration = {
    T001: {
        messageType: "note",
        channel: 10,
        number: 36,
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
        invert: false
    }
}) {
    const hardware = {
        id: "lab-16d",
        name: "LAB-16D",
        vendor: "bipoLab engineering",
        hardwareRevision: "MOCK",
        components: [{
            id: "T001",
            type: "trigger",
            label: "Trigger 1",
            position: { x: 0, y: 0 },
            metadata: { input: 1, defaultName: "Kick", sensor: "analog" }
        }],
        connectors: []
    };

    return {
        async hello() {
            return {
                id: "lab-16d",
                name: "LAB-16D",
                firmware: "MOCK 1.0.0",
                protocol: "MOCK 1.0",
                hardware: "MOCK",
                capabilities: {
                    trigger: {
                        inputs: 16,
                        sensorType: "analog",
                        resolutions: [7, 10, 12, 14],
                        curves: ["linear", "soft", "hard", "log", "exp"]
                    }
                }
            };
        },
        async read(resource) {
            if (resource === "/hardware") return hardware;
            if (resource === "/configuration") return configuration;
            if (resource === "/runtime") return { T001: 0 };
            if (resource === "/connectivity") return {
                usb: { enabled: true, status: "connected" },
                midiOutputs: { usb: true, bluetooth: true },
                bluetooth: { enabled: true, status: "advertising", name: "LAB-16D", connections: 0, midiEnabled: true }
            };
            throw new Error(resource);
        }
    };
}

describe("LAB-16D trigger configuration", () => {
    it("loads analog trigger hardware and exposes trigger capabilities", async () => {
        const model = new DeviceModel(new EventBus(), createTriggerCore());
        await model.load();

        expect(model.hardware.component("T001")?.type).toBe("trigger");
        expect(model.getCapabilities().trigger.resolutions).toEqual([7, 10, 12, 14]);
        expect(model.getComponentConfiguration("T001")?.number).toBe(36);
    });

    it("accepts valid trigger settings and rejects unsupported values", async () => {
        const model = new DeviceModel(new EventBus(), createTriggerCore());
        await model.load();

        expect(model.validateConfiguration()).toEqual([]);

        model.updateComponentConfiguration("T001", {
            resolution: 8,
            threshold: 120,
            curve: "unknown"
        });

        const issues = model.validateConfiguration();
        expect(issues.some(issue => issue.message.includes("resolution"))).toBe(true);
        expect(issues.some(issue => issue.message.includes("curve"))).toBe(true);
        expect(issues.some(issue => issue.message.includes("threshold"))).toBe(true);
    });

    it("supports 12-bit resolution mapping", async () => {
        const model = new DeviceModel(new EventBus(), createTriggerCore());
        await model.load();

        expect(model.resolutionMax({ resolution: 12 })).toBe(4095);
        expect(model.resolutionMax({ resolution: 14 })).toBe(16383);
    });
});
