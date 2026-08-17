import ComponentRegistry from "./ComponentRegistry.js";

/**
 * Static physical definition of a connected device.
 */
export default class Hardware {

    constructor(data = {}) {

        this.id = String(data.id ?? "");
        this.name = String(data.name ?? "");
        this.vendor = String(data.vendor ?? "bipoLab engineering");
        this.hardwareRevision = String(data.hardwareRevision ?? "");

        this.componentRegistry = new ComponentRegistry(
            Array.isArray(data.components) ? data.components : []
        );

        this.connectors = Object.freeze(
            (Array.isArray(data.connectors) ? data.connectors : [])
                .map(connector => Object.freeze({ ...connector }))
        );

        Object.freeze(this);

    }

    /**
     * Preferred domain API.
     */
    component(id) {
        return this.componentRegistry.component(id);
    }

    hasComponent(id) {
        return this.componentRegistry.has(id);
    }

    components() {
        return this.componentRegistry.components();
    }

    componentsOfType(type) {
        return this.componentRegistry.componentsOfType(type);
    }

    componentCount(type = null) {
        return this.componentRegistry.count(type);
    }

    /**
     * Compatibility aliases retained while older UI modules are migrated.
     */
    getComponents() {
        return this.components();
    }

    getComponent(id) {
        return this.component(id);
    }

    getComponentsByType(type) {
        return this.componentsOfType(type);
    }

    getConnectors() {
        return this.connectors;
    }

    getConnector(id) {
        return this.connectors.find(connector => connector.id === id) ?? null;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            vendor: this.vendor,
            hardwareRevision: this.hardwareRevision,
            components: this.componentRegistry.toJSON(),
            connectors: this.connectors.map(connector => ({ ...connector }))
        };
    }

}
