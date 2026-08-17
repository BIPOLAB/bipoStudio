/**
 * Position
 * --------
 * Representa una posición 2D inmutable.
 */
export default class Position {

    constructor(x = 0, y = 0) {
        this.#x = Number(x);
        this.#y = Number(y);

        Object.freeze(this);
    }

    #x;
    #y;

    get x() {
        return this.#x;
    }

    get y() {
        return this.#y;
    }

    equals(other) {
        return other instanceof Position
            && this.#x === other.x
            && this.#y === other.y;
    }

    translate(dx = 0, dy = 0) {
        return new Position(
            this.#x + Number(dx),
            this.#y + Number(dy)
        );
    }

    clone() {
        return new Position(
            this.#x,
            this.#y
        );
    }

    toJSON() {
        return {
            x: this.#x,
            y: this.#y
        };
    }

    static fromJSON(data = {}) {
        return new Position(
            data.x ?? 0,
            data.y ?? 0
        );
    }

}