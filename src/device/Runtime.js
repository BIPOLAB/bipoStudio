/**
 * Current volatile state reported by the device.
 */
export default class Runtime {

    constructor(data = {}, hardware = null) {

        const source = data && typeof data === "object" ? data : {};
        this.values = {};

        for (const [componentId, value] of Object.entries(source)) {
            if (!hardware || hardware.hasComponent(componentId)) {
                this.values[componentId] = value;
            }
        }

    }

    get(componentId) {
        return Object.hasOwn(this.values, componentId)
            ? this.values[componentId]
            : null;
    }

    set(componentId, value) {
        this.values[componentId] = value;
    }

    toJSON() {
        return structuredClone(this.values);
    }

}
