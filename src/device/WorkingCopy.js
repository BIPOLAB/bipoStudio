/**
 * Editable configuration isolated from the configuration stored on device.
 */
export default class WorkingCopy {

    constructor(configuration) {
        this.values = configuration.toJSON();
        this.baseline = configuration.toJSON();
    }

    get(componentId) {
        return Object.hasOwn(this.values, componentId)
            ? structuredClone(this.values[componentId])
            : null;
    }

    set(componentId, value) {
        this.values[componentId] = structuredClone(value ?? {});
    }

    reset() {
        this.values = structuredClone(this.baseline);
    }

    markCommitted() {
        this.baseline = structuredClone(this.values);
    }

    isDirty() {
        return JSON.stringify(this.values) !== JSON.stringify(this.baseline);
    }

    toJSON() {
        return structuredClone(this.values);
    }

}
