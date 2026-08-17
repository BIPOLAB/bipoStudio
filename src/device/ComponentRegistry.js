import Component from "./Component.js";
import ComponentId from "./ComponentId.js";
import { isComponentType } from "./ComponentType.js";

/**
 * Read-only indexed collection of physical device components.
 *
 * ComponentRegistry owns storage and validation so consumers never depend on
 * arrays, maps, or any other implementation detail.
 */
export default class ComponentRegistry {

    #components;
    #byId;
    #byType;

    constructor(components = []) {

        if (!Array.isArray(components)) {
            throw new TypeError("ComponentRegistry expects an array of components.");
        }

        const normalizedComponents = [];
        const byId = new Map();
        const byType = new Map();

        for (const value of components) {
            const component = value instanceof Component
                ? value
                : new Component(value);

            if (byId.has(component.id)) {
                throw new Error(`Duplicate component id "${component.id}".`);
            }

            normalizedComponents.push(component);
            byId.set(component.id, component);

            const typeComponents = byType.get(component.type) ?? [];
            typeComponents.push(component);
            byType.set(component.type, typeComponents);
        }

        this.#components = Object.freeze([...normalizedComponents]);
        this.#byId = byId;
        this.#byType = new Map(
            [...byType.entries()].map(([type, values]) => [
                type,
                Object.freeze([...values])
            ])
        );

        Object.freeze(this);

    }

    component(id) {
        const normalizedId = ComponentId.from(id).toString();
        return this.#byId.get(normalizedId) ?? null;
    }

    has(id) {
        return this.component(id) !== null;
    }

    components() {
        return this.#components;
    }

    componentsOfType(type) {

        if (!isComponentType(type)) {
            throw new Error(`Unsupported component type "${type}".`);
        }

        return this.#byType.get(type) ?? Object.freeze([]);

    }

    count(type = null) {
        return type === null
            ? this.#components.length
            : this.componentsOfType(type).length;
    }

    isEmpty() {
        return this.#components.length === 0;
    }

    [Symbol.iterator]() {
        return this.#components[Symbol.iterator]();
    }

    toJSON() {
        return this.#components.map(component => component.toJSON());
    }

}
