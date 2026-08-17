export default class BIPSession {

    constructor(eventBus) {

        this.eventBus = eventBus;

        this.eventBus.on(
            "transport:message",
            this.onMessage.bind(this)
        );

    }

    onMessage(message) {

        switch (message.type) {

            case "HELLO":

                this.eventBus.emit(

                    "device:hello",

                    message.device

                );

                break;

        }

    }

}