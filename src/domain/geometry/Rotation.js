/**
 * Rotation
 * --------
 * Representa una rotación 2D inmutable en grados.
 */
export default class Rotation {

    #degrees;

    constructor(degrees = 0) {
        this.#degrees = Rotation.#normalize(Number(degrees));

        Object.freeze(this);
    }

    get degrees() {
        return this.#degrees;
    }

    get radians() {
        return this.#degrees * Math.PI / 180;
    }

    equals(other) {
        return other instanceof Rotation
            && this.#degrees === other.degrees;
    }

    rotate(deltaDegrees = 0) {
        return new Rotation(
            this.#degrees + Number(deltaDegrees)
        );
    }

    clone() {
        return new Rotation(this.#degrees);
    }

    toJSON() {
        return {
            degrees: this.#degrees
        };
    }

    static fromJSON(data = {}) {
        return new Rotation(
            data.degrees ?? 0
        );
    }

    static #normalize(value) {

        let angle = value % 360;

        if (angle < 0) {
            angle += 360;
        }

        return angle;
    }

}