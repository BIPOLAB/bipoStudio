import PanelProperties from "./PanelProperties.js";
import PanelLayout from "../layout/PanelLayout.js";

export default class Panel {

    #properties;
    #layout;

    constructor(properties = new PanelProperties(), layout = new PanelLayout()) {

        if (!(properties instanceof PanelProperties)) {
            throw new TypeError("Panel properties must be a PanelProperties instance.");
        }

        if (!(layout instanceof PanelLayout)) {
            throw new TypeError("Panel layout must be a PanelLayout instance.");
        }

        this.#properties = properties;
        this.#layout = layout;

    }

    get properties() {
        return this.#properties;
    }

    get layout() {
        return this.#layout;
    }

    clone() {

        return new Panel(
            this.#properties.clone(),
            this.#layout.clone()
        );

    }

    toJSON() {

        return {
            properties: this.#properties.toJSON(),
            layout: this.#layout.toJSON()
        };

    }

    static fromJSON(json = {}) {

        return new Panel(
            PanelProperties.fromJSON(json.properties),
            PanelLayout.fromJSON(json.layout)
        );

    }

}