import MockDeviceInfo from "./MockDeviceInfo.js";
import MockPanelFactory from "./MockPanelFactory.js";
import MockConfiguration from "./MockConfiguration.js";

export default class MockDevice {

    #info;
    #panel;
    #configuration;

    constructor() {

        this.#info = new MockDeviceInfo();

        this.#panel = MockPanelFactory.create();

        this.#configuration = new MockConfiguration();

    }

    async getInfo() {

        return this.#info;

    }

    async getPanel() {

        return this.#panel;

    }

    async getConfiguration() {

        return this.#configuration;

    }

    async saveConfiguration(configuration) {

        this.#configuration = configuration;

        return true;

    }

}