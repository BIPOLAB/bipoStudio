import Size from "../geometry/Size.js";

export default class PanelProperties {

    #name;
    #size;
    #background;
    #cornerRadius;

    constructor({
        name = "",
        size = new Size(),
        background = "transparent",
        cornerRadius = 0
    } = {}) {

        if (!(size instanceof Size)) {
            throw new TypeError("Panel size must be a Size instance.");
        }

        if (cornerRadius < 0) {
            throw new Error("Panel corner radius cannot be negative.");
        }

        this.#name = name;
        this.#size = size;
        this.#background = background;
        this.#cornerRadius = cornerRadius;

    }

    get name() {
        return this.#name;
    }

    get size() {
        return this.#size;
    }

    get background() {
        return this.#background;
    }

    get cornerRadius() {
        return this.#cornerRadius;
    }

    equals(other) {

        return other instanceof PanelProperties
            && this.#name === other.#name
            && this.#background === other.#background
            && this.#cornerRadius === other.#cornerRadius
            && this.#size.equals(other.#size);

    }

    clone() {

        return new PanelProperties({
            name: this.#name,
            size: this.#size.clone(),
            background: this.#background,
            cornerRadius: this.#cornerRadius
        });

    }

    toJSON() {

        return {
            name: this.#name,
            size: this.#size.toJSON(),
            background: this.#background,
            cornerRadius: this.#cornerRadius
        };

    }

    static fromJSON(json = {}) {

        return new PanelProperties({
            name: json.name ?? "",
            size: Size.fromJSON(json.size),
            background: json.background ?? "transparent",
            cornerRadius: json.cornerRadius ?? 0
        });

    }

}