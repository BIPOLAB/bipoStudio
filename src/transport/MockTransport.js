export default class MockTransport {

    constructor(eventBus) {

        this.eventBus = eventBus;

    }

    start() {

        console.log(
            "MockTransport started."
        );

        queueMicrotask(() => {

            this.eventBus.emit(
                "transport:message",
                {

                    type: "HELLO",

                    device: {

                        id: "lab16",

                        name: "LAB-16",

                        manufacturer: "bipoLab",

                        firmware: "0.1.0",

                        protocol: "1.0"

                    }

                }

            );

        });

    }

}