export default class Header {

    constructor(element, eventBus) {

        this.element = element;

        this.eventBus = eventBus;

        this.device = null;

        this.eventBus.on(

            "session:changed",

            this.onSessionChanged.bind(this)

        );

    }

    show() {

        this.render();

    }

    onSessionChanged(device) {

        this.device = device;

        this.render();

    }

    render() {

        this.element.innerHTML = `

            <div class="header-left">

                bipoStudio

            </div>

            <div class="header-right">

                ${
                    this.device
                        ? `${this.device.name} · FW ${this.device.firmware}`
                        : "Waiting for device..."
                }

            </div>

        `;

    }

}