import { Events } from "../core/Events.js";

/**
 * Fixed visual representation of the emulated device.
 *
 * This is intentionally not an editor: component positions come from the
 * device hardware model and cannot be moved by the user.
 */
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
                <div class="waiting">Waiting for a bipoLab device...</div>
            `;
            return;
        }

        const components = this.model.hardware.getComponents();

        this.element.innerHTML = `
            <section class="device-workspace">
                <div class="device-workspace__heading">
                    <div>
                        <span class="section-label">DEVICE</span>
                        <h1>${this.model.device.name}</h1>
                    </div>
                    <span class="device-workspace__mode">CONFIGURATION</span>
                </div>

                <div class="device-surface-wrap">
                    <div class="device-surface" aria-label="MIMO-LAB device mock">
                        <div class="device-surface__brand">bipoLab engineering</div>
                        <div class="device-surface__model">MIMO-LAB</div>

                        ${components.map(component =>
                            this.renderComponent(component)
                        ).join("")}
                    </div>
                </div>

                <p class="device-workspace__hint">
                    Select a control to configure its MIDI behavior.
                </p>
            </section>
        `;

        this.bindComponentEvents();
    }

    renderComponent(component) {
        const selected = component.id === this.selectedComponentId;
        const position = component.position ?? { x: 0, y: 0 };

        return `
            <button
                class="device-control device-control--${component.type} ${selected ? "device-control--selected" : ""}"
                data-component-id="${component.id}"
                style="left:${position.x}px; top:${position.y}px"
                type="button"
                title="${component.label}"
                aria-label="Configure ${component.label}"
            >
                <span class="device-control__visual"></span>
                <span class="device-control__label">${component.label}</span>
            </button>
        `;
    }

    bindComponentEvents() {
        this.element
            .querySelectorAll("[data-component-id]")
            .forEach(control => {
                control.addEventListener("click", () => {
                    this.selectionManager.select(
                        control.dataset.componentId
                    );
                });
            });
    }
}
