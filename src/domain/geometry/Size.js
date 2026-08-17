/**
 * Size
 * ----
 * Representa un tamaño 2D inmutable.
 */
export default class Size {

    #width;
    #height;

    constructor(width = 0, height = 0) {
        this.#width = Number(width);
        this.#height = Number(height);

        if (this.#width < 0) {
            throw new Error("Width cannot be negative.");
        }

        if (this.#height < 0) {
            throw new Error("Height cannot be negative.");
        }

        Object.freeze(this);
    }

    get width() {
        return this.#width;
    }

    get height() {
        return this.#height;
    }

    equals(other) {
        return other instanceof Size
            && this.#width === other.width
            && this.#height === other.height;
    }

    resize(width = this.#width, height = this.#height) {
        return new Size(
            width,
            height
        );
    }

    clone() {
        return new Size(
            this.#width,
            this.#height
        );
    }

    toJSON() {
        return {
            width: this.#width,
            height: this.#height
        };
    }

    static fromJSON(data = {}) {
        return new Size(
            data.width ?? 0,
            data.height ?? 0
        );
    }

}