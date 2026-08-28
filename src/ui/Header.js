import { Events } from "../core/Events.js";

export default class Header {

    constructor(element, eventBus) {
        this.element = element;
        this.eventBus = eventBus;
        this.device = null;
        this.dirty = false;

        this.eventBus.on(Events.SESSION_CHANGED, this.onSessionChanged.bind(this));
        this.eventBus.on(Events.WORKING_COPY_CHANGED, this.onWorkingCopyChanged.bind(this));
    }

    show() {
        this.render();
    }

    onSessionChanged(device) {
        this.device = device;
        this.render();
    }

    onWorkingCopyChanged(payload = {}) {
        this.dirty = Boolean(payload.dirty);
        this.render();
    }

    render() {
        this.element.innerHTML = `
            <div class="brand">
                <span class="brand__name">bipoStudio</span>
                <span class="brand__device">
                    ${this.device ? `${this.device.name} · FW ${this.device.firmware}` : "Waiting for device..."}
                </span>
            </div>

            <div class="header__actions">
                <span class="header__dirty ${this.dirty ? "header__dirty--visible" : ""}">
                    Unsaved changes
                </span>
                <button class="button button--secondary" type="button" data-action="reset" ${this.dirty ? "" : "disabled"}>
                    Reset
                </button>
                <button class="button button--primary" type="button" data-action="save" ${this.dirty ? "" : "disabled"}>
                    Save
                </button>
            </div>
        `;

        this.element.querySelector('[data-action="reset"]')?.addEventListener("click", () => {
            this.eventBus.emit(Events.CONFIGURATION_RESET_REQUEST);
        });

        this.element.querySelector('[data-action="save"]')?.addEventListener("click", () => {
            this.eventBus.emit(Events.CONFIGURATION_COMMIT_REQUEST);
        });
    }

}
