import { Events } from "../core/Events.js";

/**
 * Lightweight MIDI monitor for the emulated device.
 * It observes application MIDI events; it does not send MIDI to hardware.
 */
export default class MidiMonitor {

    constructor(element, eventBus, maxMessages = 32) {
        this.element = element;
        this.eventBus = eventBus;
        this.maxMessages = maxMessages;
        this.messages = [];

        this.eventBus.on(Events.MIDI_MESSAGE, this.onMidiMessage.bind(this));
        this.render();
    }

    onMidiMessage(message) {
        this.messages.unshift({
            ...message,
            time: new Date(message.timestamp ?? Date.now())
        });

        this.messages = this.messages.slice(0, this.maxMessages);
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <section class="midi-monitor">
                <div class="midi-monitor__header">
                    <div>
                        <span class="section-label">RUNTIME</span>
                        <h2>MIDI Monitor</h2>
                    </div>
                    <span class="midi-monitor__status">MOCK</span>
                </div>
                <div class="midi-monitor__table-wrap">
                    <table class="midi-monitor__table">
                        <thead>
                            <tr>
                                <th>TIME</th>
                                <th>CONTROL</th>
                                <th>MESSAGE</th>
                                <th>CH</th>
                                <th>NUMBER</th>
                                <th>VALUE</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.messages.length
                                ? this.messages.map(message => this.renderMessage(message)).join("")
                                : `<tr><td colspan="6" class="midi-monitor__empty">Move a control on the mock device.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </section>
        `;
    }

    renderMessage(message) {
        const time = message.time instanceof Date
            ? message.time.toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })
            : "--:--:--";

        return `
            <tr>
                <td>${time}</td>
                <td>${message.componentId}</td>
                <td>${String(message.type).toUpperCase()}</td>
                <td>${message.channel}</td>
                <td>${message.number}</td>
                <td>${message.value}</td>
            </tr>
        `;
    }
}
