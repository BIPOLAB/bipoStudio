import Position from "./Position.js";
import Size from "./Size.js";

/**
 * Bounds
 * -------
 * Representa un rectángulo inmutable mediante
 * una posición y un tamaño.
 */
export default class Bounds {

    #position;
    #size;

    constructor(position = new Position(), size = new Size()) {

        if (!(position instanceof Position)) {
            throw new TypeError("position must be a Position.");
        }

        if (!(size instanceof Size)) {
            throw new TypeError("size must be a Size.");
        }

        this.#position = position;
        this.#size = size;

        Object.freeze(this);
    }

    get position() {
        return this.#position;
    }

    get size() {
        return this.#size;
    }

    get x() {
        return this.#position.x;
    }

    get y() {
        return this.#position.y;
    }

    get width() {
        return this.#size.width;
    }

    get height() {
        return this.#size.height;
    }

    get left() {
        return this.x;
    }

    get top() {
        return this.y;
    }

    get right() {
        return this.x + this.width;
    }

    get bottom() {
        return this.y + this.height;
    }

    get centerX() {
        return this.x + this.width / 2;
    }

    get centerY() {
        return this.y + this.height / 2;
    }

    contains(x, y) {
        return (
            x >= this.left &&
            x <= this.right &&
            y >= this.top &&
            y <= this.bottom
        );
    }

    translate(dx = 0, dy = 0) {
        return new Bounds(
            this.#position.translate(dx, dy),
            this.#size
        );
    }

    resize(width = this.width, height = this.height) {
        return new Bounds(
            this.#position,
            new Size(width, height)
        );
    }

    equals(other) {
        return other instanceof Bounds
            && this.#position.equals(other.position)
            && this.#size.equals(other.size);
    }

    clone() {
        return new Bounds(
            this.#position.clone(),
            this.#size.clone()
        );
    }

    toJSON() {
        return {
            position: this.#position.toJSON(),
            size: this.#size.toJSON()
        };
    }

    static fromJSON(data = {}) {
        return new Bounds(
            Position.fromJSON(data.position),
            Size.fromJSON(data.size)
        );
    }

}