export default class MockDeviceInfo {

    #manufacturer;
    #product;
    #model;
    #serialNumber;
    #firmwareVersion;
    #hardwareVersion;

    constructor() {

        this.#manufacturer = "bipoLab";
        this.#product = "LAB-16";
        this.#model = "LAB16";
        this.#serialNumber = "LAB16-000001";
        this.#firmwareVersion = "0.1.0";
        this.#hardwareVersion = "1.0";

    }

    get manufacturer() {
        return this.#manufacturer;
    }

    get product() {
        return this.#product;
    }

    get model() {
        return this.#model;
    }

    get serialNumber() {
        return this.#serialNumber;
    }

    get firmwareVersion() {
        return this.#firmwareVersion;
    }

    get hardwareVersion() {
        return this.#hardwareVersion;
    }

    toJSON() {

        return {
            manufacturer: this.#manufacturer,
            product: this.#product,
            model: this.#model,
            serialNumber: this.#serialNumber,
            firmwareVersion: this.#firmwareVersion,
            hardwareVersion: this.#hardwareVersion
        };

    }

}