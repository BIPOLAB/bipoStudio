import MockTransport from "../transport/MockTransport.js";

export default class Bridge {

    constructor(eventBus, transport = null) {

        this.eventBus = eventBus;

        this.transport =
            transport ??
            new MockTransport(eventBus);

    }

    start() {

        this.transport.start();

    }

}