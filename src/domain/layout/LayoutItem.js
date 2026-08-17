import Bounds from "../geometry/Bounds.js";
import Rotation from "../geometry/Rotation.js";

/**
 * LayoutItem
 * ----------
 * Describe la ubicación física de un componente dentro
 * de un panel. No conoce el componente, únicamente su id.
 */
export default class LayoutItem {

    #componentId;
    #bounds;
    #rotation;

    constructor(
        componentId,
        bounds = new Bounds(),
        rotation = new Rotation()
    ) {

        if (typeof componentId !== "string" || componentId.length === 0) {
            throw new TypeError("componentId must be a non-empty string.");
        }

        if (!(bounds instanceof Bounds)) {
            throw new TypeError("bounds must be a Bounds.");
        }

        if (!(rotation instanceof Rotation)) {
            throw new TypeError("rotation must be a Rotation.");
        }

        this.#componentId = componentId;
        this.#bounds = bounds;
        this.#rotation = rotation;

        Object.freeze(this);
    }

    get componentId() {
        return this.#componentId;
    }

    get bounds() {
        return this.#bounds;
    }

    get rotation() {
        return this.#rotation;
    }

    withBounds(bounds) {
        return new LayoutItem(
            this.#componentId,
            bounds,
            this.#rotation
        );
    }

    withRotation(rotation) {
        return new LayoutItem(
            this.#componentId,
            this.#bounds,
            rotation
        );
    }

    equals(other) {
        return other instanceof LayoutItem
            && this.#componentId === other.componentId
            && this.#bounds.equals(other.bounds)
            && this.#rotation.equals(other.rotation);
    }

    clone() {
        return new LayoutItem(
            this.#componentId,
            this.#bounds.clone(),
            this.#rotation.clone()
        );
    }

    toJSON() {
        return {
            componentId: this.#componentId,
            bounds: this.#bounds.toJSON(),
            rotation: this.#rotation.toJSON()
        };
    }

    static fromJSON(data = {}) {
        return new LayoutItem(
            data.componentId,
            Bounds.fromJSON(data.bounds),
            Rotation.fromJSON(data.rotation)
        );
    }

}