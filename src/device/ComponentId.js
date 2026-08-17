const PREFIX_BY_TYPE = Object.freeze({
    knob: "K",
    fader: "F",
    switch: "S",
    button: "B",
    encoder: "E",
    led: "L",
    display: "D"
});

const COMPONENT_ID_PATTERN = /^[A-Z][0-9]{3}$/;

/**
 * Immutable physical identity of a device component.
 */
export default class ComponentId {

    constructor(value) {

        const normalized = String(value ?? "")
            .trim()
            .toUpperCase();

        if (!COMPONENT_ID_PATTERN.test(normalized)) {
            throw new Error(
                `Invalid component id "${value}". Expected format: K001.`
            );
        }

        this.value = normalized;
        Object.freeze(this);

    }

    static from(value) {
        return value instanceof ComponentId
            ? value
            : new ComponentId(value);
    }

    static for(type, index) {

        const prefix = PREFIX_BY_TYPE[type];

        if (!prefix) {
            throw new Error(`Cannot create an id for component type "${type}".`);
        }

        if (!Number.isInteger(index) || index < 1 || index > 999) {
            throw new Error("Component index must be an integer between 1 and 999.");
        }

        return new ComponentId(`${prefix}${String(index).padStart(3, "0")}`);

    }

    toString() {
        return this.value;
    }

    toJSON() {
        return this.value;
    }

}
