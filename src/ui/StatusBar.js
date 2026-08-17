export default class StatusBar {

    constructor(element, eventBus) {

        this.element = element;
        this.eventBus = eventBus;
        this.status = "Ready";

        this.eventBus.on(
            "session:changed",
            this.onSessionChanged.bind(this)
        );

        this.eventBus.on(
            "selection:changed",
            this.onSelectionChanged.bind(this)
        );

    }

    show() {

        this.render();

    }

    onSessionChanged(device) {

        this.status =
            `Connected to ${device.name}`;

        this.render();

    }

    onSelectionChanged(componentId) {

        this.status =
            `Selected: ${componentId}`;

        this.render();

    }

    render() {

        this.element.textContent =
            this.status;

    }

}