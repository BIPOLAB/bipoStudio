/**
 * Stored behavior assigned to physical components.
 */
export default class Configuration {

    constructor(data = {}, hardware = null) {
        this.values = this.normalize(data, hardware);
    }

    normalize(data, hardware) {

        const source = data && typeof data === "object" ? data : {};
        const values = {};

        for (const [componentId, configuration] of Object.entries(source)) {
            if (hardware && !hardware.hasComponent(componentId)) {
                continue;
            }

            values[componentId] = structuredClone(configuration ?? {});
        }

        return values;

    }

    has(componentId) {
        return Object.hasOwn(this.values, componentId);
    }

    get(componentId) {
        return this.has(componentId)
            ? structuredClone(this.values[componentId])
            : null;
    }

    toJSON() {
        return structuredClone(this.values);
    }

}
