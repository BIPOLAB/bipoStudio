import { Events } from "../core/Events.js";

export default class Inspector {

    constructor(element, eventBus) {

        this.element = element;
        this.eventBus = eventBus;

        this.model = null;
        this.selectedComponentId = null;

        this.eventBus.on(
            Events.DEVICE_MODEL_READY,
            this.onModelReady.bind(this)
        );

        this.eventBus.on(
            Events.SELECTION_CHANGED,
            this.onSelectionChanged.bind(this)
        );

    }

    onModelReady(model) {
        this.model = model;
        this.render();
    }

    onSelectionChanged(componentId) {
        this.selectedComponentId = componentId;
        this.render();
    }

    render() {

        if (!this.model || !this.selectedComponentId) {
            this.element.innerHTML = `
                <div class="inspector-empty">
                    No component selected.
                </div>
            `;
            return;
        }

        const component = this.model.getComponent(
            this.selectedComponentId
        );
        const configuration = this.model.getComponentConfiguration(
            this.selectedComponentId
        );
        const runtimeValue = this.model.getComponentRuntime(
            this.selectedComponentId
        );

        if (!component) {
            this.element.innerHTML = `
                <div class="inspector-empty">
                    The selected component is not available.
                </div>
            `;
            return;
        }

        this.element.innerHTML = `
            <section class="inspector-content">
                <h2>${component.label}</h2>
                <p>${component.id}</p>

                <dl>
                    <div>
                        <dt>Physical type</dt>
                        <dd>${component.type}</dd>
                    </div>
                    <div>
                        <dt>Message</dt>
                        <dd>${configuration?.messageType ?? "Not assigned"}</dd>
                    </div>
                    <div>
                        <dt>Channel</dt>
                        <dd>${configuration?.channel ?? "—"}</dd>
                    </div>
                    <div>
                        <dt>Number</dt>
                        <dd>${configuration?.number ?? "—"}</dd>
                    </div>
                    <div>
                        <dt>Runtime value</dt>
                        <dd>${runtimeValue ?? "—"}</dd>
                    </div>
                </dl>
            </section>
        `;

    }

}
