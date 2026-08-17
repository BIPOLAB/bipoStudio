export default class DeviceSession {

    constructor(eventBus) {

        this.eventBus = eventBus;

        this.device = null;

        this.eventBus.on(

            "device:hello",

            this.onHello.bind(this)

        );

    }

    onHello(device) {

        this.device = device;

        console.log("Device connected:", device);

        this.eventBus.emit(

            "session:changed",

            this.device

        );

    }

}