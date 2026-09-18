import { Events } from "../core/Events.js";

export default class Header {
    constructor(element, eventBus) {
        this.element = element;
        this.eventBus = eventBus;
        this.device = null;
        this.dirty = false;
        this.changedComponents = new Set();
        this.pendingSaveCount = 0;
        this.toastTimer = null;
        this.modal = null;

        this.eventBus.on(Events.SESSION_CHANGED, this.onSessionChanged.bind(this));
        this.eventBus.on(Events.WORKING_COPY_CHANGED, this.onWorkingCopyChanged.bind(this));
        this.eventBus.on(Events.CONFIGURATION_COMMITTED, this.onConfigurationCommitted.bind(this));
        this.eventBus.on(Events.CONFIGURATION_ERROR, this.onConfigurationError.bind(this));
    }

    show() { this.render(); }

    onSessionChanged(device) {
        this.closeModal();
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

        this.showModal({
            eyebrow: "CONFIGURATION",
            title: "Reset changes?",
            message: "Your current edits will be discarded and the device configuration will return to the last saved state.",
            confirmLabel: "Reset changes",
            confirmClass: "header-modal__button--danger",
            onConfirm: () => this.eventBus.emit(Events.CONFIGURATION_RESET_REQUEST)
        });
    }

    confirmSave() {
        if (!this.dirty) return;

        const count = this.changedComponents.size;
        this.pendingSaveCount = count;
        const changeLabel = count === 1 ? "1 change" : `${count} changes`;

        this.showModal({
            eyebrow: "SAVE CONFIGURATION",
            title: `Apply ${changeLabel}?`,
            message: "The current configuration will be written to the device.",
            confirmLabel: "Save configuration",
            onConfirm: () => this.eventBus.emit(Events.CONFIGURATION_COMMIT_REQUEST),
            onCancel: () => { this.pendingSaveCount = 0; }
        });
    }

    showModal({ eyebrow, title, message, confirmLabel, confirmClass = "", onConfirm, onCancel }) {
        this.closeModal();

        const overlay = document.createElement("div");
        overlay.className = "header-modal";
        overlay.setAttribute("role", "presentation");
        overlay.innerHTML = `
            <div class="header-modal__backdrop" data-action="modal-cancel"></div>
            <section class="header-modal__panel" role="dialog" aria-modal="true" aria-labelledby="header-modal-title">
                <div class="header-modal__rule"></div>
                <span class="header-modal__eyebrow">${eyebrow}</span>
                <h2 id="header-modal-title">${title}</h2>
                <p>${message}</p>
                <div class="header-modal__actions">
                    <button type="button" class="header-modal__button header-modal__button--cancel" data-action="modal-cancel">Back</button>
                    <button type="button" class="header-modal__button ${confirmClass}" data-action="modal-confirm">${confirmLabel}</button>
                </div>
                <span class="header-modal__brand">bipoLab / bipoStudio</span>
            </section>
        `;

        if (!document.getElementById("header-modal-styles")) {
            const style = document.createElement("style");
            style.id = "header-modal-styles";
            style.textContent = `
                .header-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 2000;
                    display: grid;
                    place-items: center;
                    font-family: inherit;
                }
                .header-modal__backdrop {
                    position: absolute;
                    inset: 0;
                    background: rgba(20, 19, 17, .38);
                    backdrop-filter: blur(3px);
                }
                .header-modal__panel {
                    position: relative;
                    width: min(430px, calc(100vw - 40px));
                    padding: 27px 29px 22px;
                    box-sizing: border-box;
                    background: #f3f0e7;
                    color: #20201d;
                    border: 1px solid #20201d;
                    box-shadow: 10px 10px 0 rgba(20, 19, 17, .15), 0 24px 60px rgba(0, 0, 0, .22);
                    animation: bipolab-modal-in 140ms ease-out;
                }
                .header-modal__rule {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 72px;
                    height: 5px;
                    background: #e84a2a;
                }
                .header-modal__eyebrow {
                    display: block;
                    margin-bottom: 9px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: .16em;
                    text-transform: uppercase;
                    opacity: .62;
                }
                .header-modal h2 {
                    margin: 0 0 10px;
                    font-size: 25px;
                    line-height: 1.08;
                    font-weight: 650;
                    letter-spacing: -.025em;
                }
                .header-modal p {
                    max-width: 360px;
                    margin: 0;
                    font-size: 13px;
                    line-height: 1.55;
                    opacity: .75;
                }
                .header-modal__actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 9px;
                    margin-top: 25px;
                }
                .header-modal__button {
                    min-height: 38px;
                    padding: 0 15px;
                    border: 1px solid #20201d;
                    background: #20201d;
                    color: #f3f0e7;
                    font: 700 10px/1 inherit;
                    letter-spacing: .08em;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: transform 100ms ease, opacity 100ms ease;
                }
                .header-modal__button:hover { transform: translateY(-1px); }
                .header-modal__button:active { transform: translateY(0); }
                .header-modal__button--cancel {
                    background: transparent;
                    color: #20201d;
                }
                .header-modal__button--danger { background: #b53b2c; border-color: #b53b2c; }
                .header-modal__brand {
                    display: block;
                    margin-top: 21px;
                    padding-top: 9px;
                    border-top: 1px solid rgba(32, 32, 29, .18);
                    font-size: 8px;
                    font-weight: 700;
                    letter-spacing: .14em;
                    text-transform: uppercase;
                    opacity: .42;
                }
                @keyframes bipolab-modal-in {
                    from { opacity: 0; transform: translateY(5px) scale(.985); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @media (max-width: 520px) {
                    .header-modal__panel { padding: 24px 22px 19px; }
                    .header-modal__actions { flex-direction: column-reverse; }
                    .header-modal__button { width: 100%; }
                }
            `;
            document.head.appendChild(style);
        }

        this.element.appendChild(overlay);
        this.modal = overlay;

        const cancel = () => {
            this.closeModal();
            onCancel?.();
        };
        overlay.querySelectorAll('[data-action="modal-cancel"]').forEach(button => button.addEventListener("click", cancel));
        overlay.querySelector('[data-action="modal-confirm"]')?.addEventListener("click", () => {
            this.closeModal();
            onConfirm?.();
        });

        this.modalKeyHandler = event => {
            if (event.key === "Escape") cancel();
        };
        window.addEventListener("keydown", this.modalKeyHandler);
        overlay.querySelector('[data-action="modal-confirm"]')?.focus();
    }

    closeModal() {
        this.modal?.remove();
        this.modal = null;
        if (this.modalKeyHandler) {
            window.removeEventListener("keydown", this.modalKeyHandler);
            this.modalKeyHandler = null;
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
            z-index: 2100;
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
        this.element.innerHTML = `
            <div class="brand">
                <span class="brand__name">bipoStudio</span>
                <span class="brand__device">${this.device ? `${this.device.name} · FW ${this.device.firmware}` : "Waiting for device..."}</span>
            </div>
            <div class="header__actions">
                <span class="header__dirty ${this.dirty ? "header__dirty--visible" : ""}">${this.dirty ? "Unsaved changes" : "Saved"}</span>
                <button class="button button--secondary" type="button" data-action="reset" ${this.dirty ? "" : "disabled"}>Reset</button>
                <button class="button button--primary" type="button" data-action="save" ${this.dirty ? "" : "disabled"}>Save</button>
            </div>
        `;

        this.element.querySelector('[data-action="reset"]')?.addEventListener("click", () => this.confirmReset());
        this.element.querySelector('[data-action="save"]')?.addEventListener("click", () => this.confirmSave());
    }
}
