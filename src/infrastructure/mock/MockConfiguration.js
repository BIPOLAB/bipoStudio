export default class MockConfiguration {

    #controls;

    constructor() {

        this.#controls = new Map();

    }

    get controls() {
        return this.#controls;
    }

    setControl(id, configuration) {

        this.#controls.set(id, configuration);

    }

    getControl(id) {

        return this.#controls.get(id);

    }

    toJSON() {

        return {
            controls: Object.fromEntries(this.#controls)
        };

    }

}