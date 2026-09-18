import { Events } from "../core/Events.js";

export default class MidiMonitor {
    constructor(element, eventBus) {
        this.element = element;
        this.eventBus = eventBus;
        this.selectedComponentId = null;
        this.selectedLabel = null;
        this.model = null;
        this.messages = [];
        this.paused = false;
        this.maxMessages = 40;
        this.eventBus.on(Events.SELECTION_CHANGED, this.onSelectionChanged.bind(this));
        this.eventBus.on(Events.DEVICE_MODEL_READY, this.onModelReady.bind(this));
        this.eventBus.on(Events.MIDI_MESSAGE, this.onMidiMessage.bind(this));
        this.render();
    }

    onModelReady(model) {
        this.model = model;
        this.messages = [];
        this.render();
    }

    onSelectionChanged(componentId) {
        this.selectedComponentId = componentId;
        const component = this.model?.getComponent(componentId);
        this.selectedLabel = component?.label ?? componentId ?? null;
        this.render();
    }

    onMidiMessage(message) {
        if (this.paused) return;
        const bytes = (message.messages?.flatMap(item => item.sysex ?? [
            item.status, item.data1, item.data2
        ]) ?? []).filter(value => value != null);
        this.messages.unshift({
            time: new Date(message.timestamp ?? Date.now()).toLocaleTimeString(),
            type: message.type?.toUpperCase() ?? "MIDI",
            channel: message.channel ?? "-",
            value: message.value ?? "-",
            hex: bytes.map(value => Number(value).toString(16).padStart(2, "0").toUpperCase()).join(" ")
        });
        this.messages = this.messages.slice(0, this.maxMessages);
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <section class="midi-monitor">
                <div class="midi-monitor__header">
                    <div><span class="section-label">MIDI MONITOR</span><h2>Output</h2></div>
                    <div class="midi-monitor__actions">
                        <span class="midi-monitor__status">${this.paused ? "PAUSED" : "LIVE"}</span>
                        <button type="button" data-action="pause">${this.paused ? "Resume" : "Pause"}</button>
                        <button type="button" data-action="clear">Clear</button>
                    </div>
                </div>
                <div class="midi-monitor__selection">${this.selectedLabel ?? "No control selected"}</div>
                <div class="midi-monitor__table-wrap">
                    <table class="midi-monitor__table">
                        <thead><tr><th>TIME</th><th>TYPE</th><th>CH</th><th>VALUE</th><th>HEX</th></tr></thead>
                        <tbody>
                            ${this.messages.length ? this.messages.map(message => `<tr><td>${message.time}</td><td>${message.type}</td><td>${message.channel}</td><td>${message.value}</td><td>${message.hex}</td></tr>`).join("") : '<tr><td colspan="5" class="midi-monitor__empty">No MIDI messages yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </section>`;
        this.element.querySelector('[data-action="pause"]')?.addEventListener("click", () => {
            this.paused = !this.paused;
            this.render();
        });
        this.element.querySelector('[data-action="clear"]')?.addEventListener("click", () => {
            this.messages = [];
            this.render();
        });
    }
}
