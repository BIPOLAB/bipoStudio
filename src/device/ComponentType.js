/**
 * Physical component families supported by the bipoStudio domain model.
 */
export const ComponentType = Object.freeze({
    KNOB: "knob",
    FADER: "fader",
    SWITCH: "switch",
    BUTTON: "button",
    ENCODER: "encoder",
    LED: "led",
    DISPLAY: "display"
});

const values = new Set(Object.values(ComponentType));

export function isComponentType(value) {
    return values.has(value);
}
