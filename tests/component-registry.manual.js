import assert from "node:assert/strict";
import ComponentRegistry from "../src/device/ComponentRegistry.js";
import { ComponentType } from "../src/device/ComponentType.js";
import Hardware from "../src/device/Hardware.js";

const components = [
    { id: "K001", type: ComponentType.KNOB, label: "Cutoff" },
    { id: "K002", type: ComponentType.KNOB, label: "Resonance" },
    { id: "F001", type: ComponentType.FADER, label: "Volume" }
];

const registry = new ComponentRegistry(components);

assert.equal(registry.count(), 3);
assert.equal(registry.count(ComponentType.KNOB), 2);
assert.equal(registry.component("k001")?.label, "Cutoff");
assert.equal(registry.has("F001"), true);
assert.equal(registry.has("B001"), false);
assert.deepEqual(
    registry.componentsOfType(ComponentType.FADER).map(component => component.id),
    ["F001"]
);
assert.throws(
    () => new ComponentRegistry([...components, components[0]]),
    /Duplicate component id/
);

const hardware = new Hardware({ id: "mimo-lab", components });

assert.equal(hardware.component("K002")?.label, "Resonance");
assert.equal(hardware.getComponent("K002")?.label, "Resonance");
assert.equal(hardware.components().length, 3);
assert.equal(hardware.getComponents().length, 3);
assert.equal(hardware.componentCount(ComponentType.KNOB), 2);
assert.equal(hardware.toJSON().components.length, 3);

console.log("Component Registry tests passed.");
