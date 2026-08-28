import { Events } from "../core/Events.js";

export default class Inspector {

    constructor(element, eventBus) {
        this.element = element;
        this.eventBus = eventBus;
        this.model = null;
        this.selectedComponentId = null;

        this.eventBus.on(Events.DEVICE_MODEL_READY, this.onModelReady.bind(this));
        this.eventBus.on(Events.SELECTION_CHANGED, this.onSelectionChanged.bind(this));
        this.eventBus.on(Events.WORKING_COPY_CHANGED, this.onWorkingCopyChanged.bind(this));
    }

    onModelReady(model) {
        this.model = model;
        this.render();
    }

    onSelectionChanged(componentId) {
        this.selectedComponentId = componentId;
        this.render();
    }

    onWorkingCopyChanged() {
        this.render();
    }

    render() {
        if (!this.model || !this.selectedComponentId) {
            this.element.innerHTML = `
                <div class="inspector-empty">
                    <p>No component selected.</p>
                    <span>Select a control on the device to edit its MIDI assignment.</span>
                </div>
            `;
            return;
        }

        const component = this.model.getComponent(this.selectedComponentId);
        const configuration = this.model.getComponentConfiguration(this.selectedComponentId);

        if (!component) {
            this.element.innerHTML = `
                <div class="inspector-empty">
                    The selected component is not available.
                </div>
            `;
            return;
        }

        const messageType = configuration?.messageType ?? "cc";
        const channel = configuration?.channel ?? 1;
        const number = configuration?.number ?? 0;
        const runtimeValue = this.model.getComponentRuntime(this.selectedComponentId);

        this.element.innerHTML = `
            <section class="inspector-content">
                <div class="inspector-title">
                    <div>
                        <span class="section-label">CONTROL</span>
                        <h2>${component.label}</h2>
                    </div>
                    <span class="inspector-id">${component.id}</span>
                </div>

                <div class="inspector-field">
                    <label for="message-type">Message</label>
                    <select id="message-type">
                        <option value="cc" ${messageType === "cc" ? "selected" : ""}>Control Change</option>
                        <option value="note" ${messageType === "note" ? "selected" : ""}>Note</option>
                    </select>
                </div>

                <div class="inspector-grid">
                    <div class="inspector-field">
                        <label for="midi-channel">Channel</label>
                        <input id="midi-channel" type="number" min="1" max="16" value="${channel}">
                    </div>
                    <div class="inspector-field">
                        <label for="midi-number">Number</label>
                        <input id="midi-number" type="number" min="0" max="127" value="${number}">
                    </div>
                </div>

                <div class="inspector-runtime">
                    <span>Runtime value</span>
                    <strong>${runtimeValue ?? "—"}</strong>
                </div>
            </section>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const messageType = this.element.querySelector("#message-type");
        const channel = this.element.querySelector("#midi-channel");
        const number = this.element.querySelector("#midi-number");

        messageType?.addEventListener("change", event => {
            this.model.updateComponentConfiguration(
                this.selectedComponentId,
                { messageType: event.target.value }
            );
        });

        channel?.addEventListener("change", event => {
            const value = this.clampInteger(event.target.value, 1, 16);
            event.target.value = value;
            this.model.updateComponentConfiguration(
                this.selectedComponentId,
                { channel: value }
            );
        });

        number?.addEventListener("change", event => {
            const value = this.clampInteger(event.target.value, 0, 127);
            event.target.value = value;
            this.model.updateComponentConfiguration(
                this.selectedComponentId,
                { number: value }
            );
        });
    }

    clampInteger(value, min, max) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed)) return min;
        return Math.min(max, Math.max(min, parsed));
    }
}
