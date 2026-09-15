import { Events } from "../core/Events.js";
import bipoCore from "../core/bipoCore.js";

export default class Header {
    constructor(element, eventBus) {
        this.element = element;
        this.eventBus = eventBus;
        this.device = null;
        this.dirty = false;
        this.changedComponents = new Set();
        this.pendingSaveCount = 0;
        this.toastTimer = null;

        this.eventBus.on(Events.SESSION_CHANGED, this.onSessionChanged.bind(this));
        this.eventBus.on(Events.WORKING_COPY_CHANGED, this.onWorkingCopyChanged.bind(this));
        this.eventBus.on(Events.CONFIGURATION_COMMITTED, this.onConfigurationCommitted.bind(this));
        this.eventBus.on(Events.CONFIGURATION_ERROR, this.onConfigurationError.bind(this));
    }

    show() { this.render(); }

    onSessionChanged(device) {
        this.device = device;
        this.dirty = false;
        this.changedComponents.clear();
        this.pendingSaveCount = 0;
        this.render();
    }

    onWorkingCopyChanged(payload = {}) {
        this.dirty = Boolean(payload.dirty);

        if (payload.componentId) {
            this.changedComponents.add(payload.componentId);
        } else if (!this.dirty) {
            this.changedComponents.clear();
        }

        this.render();
    }

    onConfigurationCommitted() {
        const count = this.pendingSaveCount;
        this.pendingSaveCount = 0;
        this.changedComponents.clear();
        this.showToast(count > 0
            ? `${count} ${count === 1 ? "change" : "changes"} applied`
            : "Configuration saved");
    }

    onConfigurationError(error) {
        this.pendingSaveCount = 0;
        this.showToast(`Save failed: ${error?.message ?? error}`, true);
    }

    confirmReset() {
        if (!this.dirty) return;
        const confirmed = window.confirm(
            "Reset all unsaved changes?\n\nYour current edits will be discarded."
        );
        if (confirmed) {
            this.eventBus.emit(Events.CONFIGURATION_RESET_REQUEST);
        }
    }

    confirmSave() {
        if (!this.dirty) return;

        const count = this.changedComponents.size;
        this.pendingSaveCount = count;
        const changeLabel = count === 1 ? "1 change" : `${count} changes`;
        const confirmed = window.confirm(
            `Apply ${changeLabel}?\n\nThe current configuration will be saved to the device.`
        );

        if (confirmed) {
            this.eventBus.emit(Events.CONFIGURATION_COMMIT_REQUEST);
        } else {
            this.pendingSaveCount = 0;
        }
    }

    showToast(message, error = false) {
        clearTimeout(this.toastTimer);
        this.element.querySelector("[data-role=toast]")?.remove();

        const toast = document.createElement("div");
        toast.dataset.role = "toast";
        toast.textContent = message;
        toast.setAttribute("role", "status");
        toast.style.cssText = `
            position: fixed;
            left: 50%;
            bottom: 28px;
            transform: translateX(-50%);
            z-index: 1000;
            padding: 11px 18px;
            border: 1px solid currentColor;
            background: var(--surface, #f4f1e8);
            color: ${error ? "#a33a2b" : "#222"};
            font: 600 12px/1.2 system-ui, sans-serif;
            letter-spacing: .04em;
            box-shadow: 0 6px 20px rgba(0,0,0,.12);
        `;
        this.element.appendChild(toast);
        this.toastTimer = window.setTimeout(() => toast.remove(), 2600);
    }

    render() {
        const devMode = Boolean(import.meta.env?.DEV);
        const mockDevices = devMode ? bipoCore.getMockDevices() : [];
        this.element.innerHTML = `
            <div class="brand">
                <span class="brand__name">bipoStudio</span>
                <span class="brand__device">${this.device ? `${this.device.name} · FW ${this.device.firmware}` : "Waiting for device..."}</span>
            </div>
            <div class="header__actions">
                ${devMode ? `<label class="dev-selector"><span>MOCK</span><select data-action="mock-device" aria-label="Mock device">${mockDevices.map(device => `<option value="${device.id}" ${device.id === this.device?.id ? "selected" : ""}>${device.name}</option>`).join("")}</select></label>` : ""}
                <span class="header__dirty ${this.dirty ? "header__dirty--visible" : ""}">${this.dirty ? "Unsaved changes" : "Saved"}</span>
                <button class="button button--secondary" type="button" data-action="reset" ${this.dirty ? "" : "disabled"}>Reset</button>
                <button class="button button--primary" type="button" data-action="save" ${this.dirty ? "" : "disabled"}>Save</button>
            </div>
        `;

        this.element.querySelector('[data-action="reset"]')?.addEventListener("click", () => this.confirmReset());
        this.element.querySelector('[data-action="save"]')?.addEventListener("click", () => this.confirmSave());
        this.element.querySelector('[data-action="mock-device"]')?.addEventListener("change", event => this.eventBus.emit(Events.MOCK_DEVICE_CHANGE_REQUEST, event.target.value));
    }
}
