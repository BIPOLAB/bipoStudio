import { describe, expect, it } from "vitest";
import ComponentRegistry from "./ComponentRegistry.js";
import { ComponentType } from "./ComponentType.js";
import Hardware from "./Hardware.js";

const components = [
    { id: "K001", type: ComponentType.KNOB, label: "Cutoff" },
    { id: "K002", type: ComponentType.KNOB, label: "Resonance" },
    { id: "F001", type: ComponentType.FADER, label: "Volume" }
];

describe("ComponentRegistry", () => {
    it("indexes components by id and type", () => {
        const registry = new ComponentRegistry(components);
        expect(registry.count()).toBe(3);
        expect(registry.count(ComponentType.KNOB)).toBe(2);
        expect(registry.component("k001")?.label).toBe("Cutoff");
        expect(registry.has("F001")).toBe(true);
        expect(registry.has("B001")).toBe(false);
        expect(registry.componentsOfType(ComponentType.FADER).map(item => item.id)).toEqual(["F001"]);
    });

    it("rejects duplicate component ids", () => {
        expect(() => new ComponentRegistry([...components, components[0]])).toThrow(/Duplicate component id/);
    });

    it("exposes registry queries through Hardware", () => {
        const hardware = new Hardware({ id: "mock-hardware", components });
        expect(hardware.component("K002")?.label).toBe("Resonance");
        expect(hardware.getComponent("K002")?.label).toBe("Resonance");
        expect(hardware.components()).toHaveLength(3);
        expect(hardware.getComponents()).toHaveLength(3);
        expect(hardware.componentCount(ComponentType.KNOB)).toBe(2);
        expect(hardware.toJSON().components).toHaveLength(3);
    });
});
