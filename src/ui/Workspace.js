import { Events } from "../core/Events.js";

export default class Workspace {

    constructor(element, eventBus, selectionManager) {

        this.element = element;
        this.eventBus = eventBus;
        this.selectionManager = selectionManager;

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

        if (!this.model?.hardware) {
            this.element.innerHTML = `
                <div class="waiting">
                    Waiting for a bipoLab device...
                </div>
            `;
            return;
        }

        const components = this.model.hardware.getComponents();

        this.element.innerHTML = `
            <section class="device-workspace">
                <h1>${this.model.device.name}</h1>
                <p>Select a physical component to inspect its configuration.</p>

                <div class="component-list">
                    ${components.map(component => {
                        const selected = component.id === this.selectedComponentId;

                        return `
                            <button
                                class="component ${selected ? "component--selected" : ""}"
                                data-component-id="${component.id}"
                                type="button"
                            >
                                <strong>${component.label}</strong>
                                <span>${component.id} · ${component.type}</span>
                            </button>
                        `;
                    }).join("")}
                </div>
            </section>
        `;

        this.bindComponentEvents();

    }

    bindComponentEvents() {

        this.element
            .querySelectorAll("[data-component-id]")
            .forEach(element => {
                element.addEventListener("click", () => {
                    this.selectionManager.select(
                        element.dataset.componentId
                    );
                });
            });

    }

}
