import LayoutItem from "./LayoutItem.js";

/**
 * PanelLayout
 * -----------
 * Colección especializada de LayoutItem.
 */
export default class PanelLayout {

    #items;

    constructor(items = []) {

        if (!Array.isArray(items)) {
            throw new TypeError("items must be an array.");
        }

        this.#items = new Map();

        for (const item of items) {
            this.add(item);
        }

    }

    get size() {
        return this.#items.size;
    }

    has(componentId) {
        return this.#items.has(
            PanelLayout.#normalizeComponentId(componentId)
        );
    }

    item(componentId) {

        const normalizedId =
            PanelLayout.#normalizeComponentId(componentId);

        return this.#items.get(normalizedId) ?? null;

    }

    items() {
        return [...this.#items.values()];
    }

    [Symbol.iterator]() {
        return this.#items.values();
    }

    componentIds() {
        return [...this.#items.keys()];
    }

    bounds(componentId) {
        return this.item(componentId)?.bounds ?? null;
    }

    rotation(componentId) {
        return this.item(componentId)?.rotation ?? null;
    }

    add(item) {

        PanelLayout.#assertLayoutItem(item);

        if (this.#items.has(item.componentId)) {
            throw new Error(
                `Layout item "${item.componentId}" already exists.`
            );
        }

        this.#items.set(item.componentId, item);

        return this;

    }

    update(item) {

        PanelLayout.#assertLayoutItem(item);

        if (!this.#items.has(item.componentId)) {
            throw new Error(
                `Layout item "${item.componentId}" does not exist.`
            );
        }

        this.#items.set(item.componentId, item);

        return this;

    }

    set(item) {

        PanelLayout.#assertLayoutItem(item);

        this.#items.set(item.componentId, item);

        return this;

    }

    remove(componentId) {

        return this.#items.delete(
            PanelLayout.#normalizeComponentId(componentId)
        );

    }

    clear() {

        this.#items.clear();

        return this;

    }

    clone() {

        return new PanelLayout(
            this.items().map(item => item.clone())
        );

    }

    toJSON() {

        return this.items().map(item => item.toJSON());

    }

    static fromJSON(data = []) {

        if (!Array.isArray(data)) {
            throw new TypeError(
                "PanelLayout JSON must be an array."
            );
        }

        return new PanelLayout(
            data.map(item => LayoutItem.fromJSON(item))
        );

    }

    static #assertLayoutItem(item) {

        if (!(item instanceof LayoutItem)) {
            throw new TypeError(
                "item must be a LayoutItem."
            );
        }

    }

    static #normalizeComponentId(componentId) {

        if (
            typeof componentId !== "string" ||
            componentId.trim().length === 0
        ) {
            throw new TypeError(
                "componentId must be a non-empty string."
            );
        }

        return componentId.trim();

    }

}