import { Events } from "../core/Events.js";

/** Selection-only monitor placeholder. MIDI event visualization will be added later. */
export default class MidiMonitor {
    constructor(element, eventBus) {
        this.element = element;
        this.eventBus = eventBus;
        this.selectedComponentId = null;
        this.selectedLabel = null;
        this.eventBus.on(Events.SELECTION_CHANGED, this.onSelectionChanged.bind(this));
        this.eventBus.on(Events.DEVICE_MODEL_READY, this.onModelReady.bind(this));
        this.render();
    }
    onModelReady(model) { this.model = model; this.render(); }
    onSelectionChanged(componentId) {
        this.selectedComponentId = componentId;
        const component = this.model?.getComponent(componentId);
        this.selectedLabel = component?.label ?? componentId ?? null;
        this.render();
    }
    render() {
        this.element.innerHTML = `<section class="midi-monitor"><div class="midi-monitor__header"><div><span class="section-label">MONITOR</span><h2>Selection</h2></div><span class="midi-monitor__status">MOCK</span></div><div class="midi-monitor__selection">${this.selectedLabel ?? "No control selected"}</div></section>`;
    }
}
