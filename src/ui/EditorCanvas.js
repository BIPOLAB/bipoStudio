import SvgRenderer from "../presentation/editor/SvgRenderer.js";

export default class EditorCanvas {

    #container;
    #renderer;
    #panel;

    constructor(container) {

        this.#container = container;
        this.#renderer = new SvgRenderer();

        this.#panel = null;

    }

    get panel() {
        return this.#panel;
    }

    clear() {

        this.#panel = null;

        this.#container.replaceChildren();

    }

    show(panel) {

        this.#panel = panel;

        this.#container.replaceChildren(
            this.#renderer.render(panel)
        );

    }

    resize() {

        const svg = this.#container.querySelector("svg");

        if (!svg) {
            return;
        }

        svg.setAttribute(
            "width",
            "100%"
        );

        svg.setAttribute(
            "height",
            "100%"
        );

    }

    refresh() {

        if (!this.#panel) {
            return;
        }

        this.show(this.#panel);

    }

}