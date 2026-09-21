import { Events } from "../core/Events.js";
import bipoCore from "../core/bipoCore.js";

export default class Sidebar {
    constructor(element, eventBus) {
        this.element = element;
        this.eventBus = eventBus;
        this.device = null;
        this.model = null;
        this.connectivity = null;
        this.open = false;
        this.activeSection = "studio";
        this.authView = "signin";
        this.authOpen = false;
        this.eventBus.on(Events.SESSION_CHANGED, this.onSessionChanged.bind(this));
        this.eventBus.on(Events.DEVICE_MODEL_READY, model => {
            this.model = model;
            this.connectivity = model.getConnectivity?.() ?? null;
            this.render();
        });
        this.eventBus.on(Events.CONNECTIVITY_CHANGED, connectivity => {
            this.connectivity = connectivity;
            this.render();
        });
        this.eventBus.on(Events.WORKING_COPY_CHANGED, () => this.render());
    }

    onSessionChanged(device) {
        this.device = device;
        this.connectivity = device?.connectivity ?? this.connectivity;
        this.render();
    }

    show() { this.render(); }

    toggle() {
        this.open = !this.open;
        this.render();
    }

    render() {
        const devMode = Boolean(import.meta.env?.DEV);
        const devices = devMode ? bipoCore.getMockDevices() : [];
        const bt = this.connectivity?.bluetooth;
        const usb = this.connectivity?.usb;
        const dirty = Boolean(this.model?.workingCopy?.isDirty?.());

        if (!devMode && this.activeSection === "tools") this.activeSection = "studio";

        const sectionMeta = {
            studio: { title: "Studio", subtitle: "CONTROL CONFIGURATION" },
            connectivity: { title: "Connectivity", subtitle: "USB / BLUETOOTH MIDI" },
            tools: { title: "Tools", subtitle: "DEVELOPER MODE" },
            account: { title: "Account", subtitle: "SIGN IN / PROFILE" }
        };
        const activeMeta = sectionMeta[this.activeSection] ?? sectionMeta.studio;

        const navItem = (section, icon, title, subtitle) =>
            '<button class="studio-sidebar__nav-item ' + (this.activeSection === section ? "is-active" : "") + '" type="button" title="' + title + '" data-section="' + section + '" aria-current="' + (this.activeSection === section ? "page" : "false") + '">' +
                '<span class="studio-sidebar__icon" aria-hidden="true">' + icon + '</span>' +
                '<span class="studio-sidebar__nav-copy"><strong>' + title + '</strong><small>' + subtitle + '</small></span>' +
            '</button>';

        let content = "";

        if (this.activeSection === "connectivity") {
            content =
                '<section class="studio-sidebar__panel">' +
                    '<div class="studio-sidebar__panel-heading">' +
                        '<span class="studio-sidebar__eyebrow">Connectivity</span>' +
                        '<h2>Connections</h2>' +
                        '<p>USB and Bluetooth MIDI routing for the connected controller.</p>' +
                    '</div>' +
                    '<div class="studio-connectivity__row"><span><b>USB MIDI</b><small>' + (usb?.status ?? "unknown") + '</small></span><i class="studio-status-dot ' + (usb?.enabled ? "is-on" : "") + '" aria-hidden="true"></i></div>' +
                    '<div class="studio-connectivity__row"><span><b>Bluetooth MIDI</b><small>' + (bt?.status ?? "unknown") + '</small></span><i class="studio-status-dot ' + (bt?.enabled ? "is-on" : "") + '" aria-hidden="true"></i></div>' +
                    '<div class="studio-sidebar__subheading">MIDI outputs</div>' +
                    '<label class="studio-sidebar__switch"><span>USB MIDI output</span><input type="checkbox" data-action="midi-output" data-output="usb" ' + (this.connectivity?.midiOutputs?.usb ? "checked" : "") + '><span class="studio-sidebar__switch-ui" aria-hidden="true"></span></label>' +
                    '<label class="studio-sidebar__switch"><span>Bluetooth MIDI output</span><input type="checkbox" data-action="midi-output" data-output="bluetooth" ' + (this.connectivity?.midiOutputs?.bluetooth ? "checked" : "") + '><span class="studio-sidebar__switch-ui" aria-hidden="true"></span></label>' +
                    '<div class="studio-sidebar__subheading">Bluetooth</div>' +
                    '<label class="studio-sidebar__switch"><span>Bluetooth power</span><input type="checkbox" data-action="bluetooth-toggle" ' + (bt?.enabled ? "checked" : "") + '><span class="studio-sidebar__switch-ui" aria-hidden="true"></span></label>' +
                    '<label class="studio-sidebar__field"><span>Bluetooth MIDI name</span><input type="text" maxlength="32" value="' + escapeHtml(bt?.name ?? this.device?.name ?? "") + '" data-action="bluetooth-name"></label>' +
                    '<p class="studio-sidebar__hint">USB and Bluetooth can remain enabled simultaneously. Bluetooth power is persisted by the device.</p>' +
                    '<button class="studio-sidebar__wide-button" type="button" data-action="reconnect">Reconnect device</button>' +
                '</section>';
        } else if (this.activeSection === "account") {
            content =
                '<section class="studio-sidebar__panel">' +
                    '<div class="studio-sidebar__panel-heading"><span class="studio-sidebar__eyebrow">bipoLab account</span><h2>Your account</h2><p>Sync configurations and access your bipoLab devices from your account.</p></div>' +
                    '<div class="studio-account-card"><div class="studio-account-avatar" aria-hidden="true">b</div><div class="studio-account-card__identity"><strong>Guest user</strong><span>Not signed in</span><small>Sign in to sync your studio</small></div></div>' +
                    '<button class="studio-sidebar__wide-button studio-sidebar__wide-button--primary" type="button" data-action="account-open">Sign in / Create account</button>' +
                    '<p class="studio-sidebar__hint">Your local configuration remains available without an account. Cloud sync will be connected to the bipoLab account service.</p>' +
                '</section>';
        } else if (this.activeSection === "tools") {
            content =
                '<section class="studio-sidebar__panel">' +
                    '<div class="studio-sidebar__panel-heading"><span class="studio-sidebar__eyebrow">Development</span><h2>Developer mode</h2><p>Development-only hardware emulation. Production bipoCore will identify the connected controller automatically.</p></div>' +
                    '<label class="studio-sidebar__field"><span>Mock controller</span><select data-action="mock-device">' +
                        devices.map(device => '<option value="' + device.id + '" ' + (device.id === this.device?.id ? "selected" : "") + '>' + device.name + '</option>').join("") +
                    '</select></label>' +
                    '<div class="studio-dev-card"><span class="studio-sidebar__eyebrow">Current mock</span><strong>' + (this.device?.name ?? "No mock selected") + '</strong><small>' + (this.device?.firmware ?? "—") + ' · ' + (this.model?.hardware?.hardwareRevision ?? "—") + '</small></div>' +
                    '<p class="studio-sidebar__hint">Use this area to test the fixed hardware profiles while the physical bipoCore is still under development.</p>' +
                '</section>';
        } else {
            content =
                '<section class="studio-sidebar__panel">' +
                    '<div class="studio-sidebar__panel-heading"><span class="studio-sidebar__eyebrow">Studio</span><h2>Configuration</h2><p>Manage the current device configuration, presets and local backups.</p></div>' +
                    '<div class="studio-sidebar__subheading">History</div>' +
                    '<div class="studio-sidebar__tool-grid"><button type="button" data-action="undo" ' + (this.model?.canUndo?.() ? "" : "disabled") + '>Undo</button><button type="button" data-action="redo" ' + (this.model?.canRedo?.() ? "" : "disabled") + '>Redo</button></div>' +
                    '<div class="studio-sidebar__subheading">Snapshots & presets</div>' +
                    '<div class="studio-sidebar__tool-grid"><button type="button" data-action="snapshot">Snapshot</button><button type="button" data-action="restore-snapshot">Restore</button><button type="button" data-action="preset-save">Save preset</button><button type="button" data-action="preset-load">Load preset</button></div>' +
                    '<div class="studio-sidebar__subheading">Configuration files</div>' +
                    '<div class="studio-sidebar__tool-grid"><button type="button" data-action="export">Export</button><button type="button" data-action="import">Import</button><button type="button" data-action="validate">Check</button></div>' +
                    '<small class="studio-sidebar__draft-status">' + (dirty ? "Draft has unsaved changes" : "Configuration is saved") + '</small>' +
                    '<input type="file" accept="application/json,.json" data-import-input hidden>' +
                    '<div class="studio-sidebar__device-card"><span class="studio-sidebar__eyebrow">Device</span><div class="studio-system-grid">' +
                        '<span><small>MODEL</small><b>' + (this.device?.name ?? "—") + '</b></span>' +
                        '<span><small>FIRMWARE</small><b>' + (this.device?.firmware ?? "—") + '</b></span>' +
                        '<span><small>HARDWARE</small><b>' + (this.model?.hardware?.hardwareRevision ?? "—") + '</b></span>' +
                        '<span><small>PROTOCOL</small><b>' + (this.device?.protocol ?? "—") + '</b></span>' +
                    '</div></div>' +
                '</section>';
        }

        this.element.innerHTML =
            '<aside class="studio-sidebar ' + (this.open ? "is-open" : "") + '" aria-label="bipoStudio navigation">' +
                '<header class="studio-sidebar__header">' +
                    '<button class="studio-sidebar__toggle" type="button" aria-label="' + (this.open ? "Collapse" : "Expand") + ' bipoStudio navigation" aria-expanded="' + this.open + '" data-action="toggle">' +
                        '<span class="studio-sidebar__mark" aria-hidden="true">b</span><span class="studio-sidebar__toggle-icon" aria-hidden="true">‹</span>' +
                    '</button>' +
                    '<div class="studio-sidebar__brand"><span class="section-label">bipoLab engineering</span><strong>' + activeMeta.title + '</strong><small>' + activeMeta.subtitle + '</small></div>' +
                '</header>' +
                '<nav class="studio-sidebar__nav" aria-label="Studio navigation">' +
                    navItem("studio", "▦", "Studio", "CONTROL CONFIGURATION") +
                    navItem("connectivity", "⌁", "Connectivity", "USB / BLUETOOTH MIDI") +
                    (devMode ? navItem("tools", "⚙", "Tools", "DEVELOPER MODE") : "") +
                    navItem("account", "◎", "Account", "SIGN IN / PROFILE") +
                '</nav>' +
                '<div class="studio-sidebar__content">' + content + '</div>' +
                '<footer class="studio-sidebar__footer"><span>bipoLab / bipoStudio</span><span>' + (this.device?.firmware ?? "DEVICE OFFLINE") + '</span></footer>' +
            '</aside>' +
            this.renderAuthModal();

        this.bindEvents();
    }

    renderAuthModal() {
        if (!this.authView) return "";
        return `
            <div class="studio-auth ${this.authOpen ? "" : "is-hidden"}" data-auth-modal>
                <div class="studio-auth__backdrop" data-action="auth-close"></div>
                <section class="studio-auth__panel" role="dialog" aria-modal="true" aria-labelledby="studio-auth-title">
                    <span class="section-label">bipoLab account</span>
                    <h2 id="studio-auth-title">Start a session</h2>
                    <p>Account authentication will connect bipoStudio to your saved configurations and devices.</p>
                    <button type="button" class="studio-auth__google" data-action="google"><span class="studio-auth__google-mark">G</span>Continue with Google</button>
                    <div class="studio-auth__divider"><span>or</span></div>
                    <div class="studio-auth__tabs">
                        <button type="button" class="${this.authView === "register" ? "" : "is-active"}" data-auth-view="signin">Sign in</button>
                        <button type="button" class="${this.authView === "register" ? "is-active" : ""}" data-auth-view="register">Create account</button>
                    </div>
                    <form class="studio-auth__form" data-auth-form>
                        ${this.authView === "register" ? '<label><span>Name</span><input name="name" type="text" autocomplete="name" placeholder="Your name"></label>' : ""}
                        <label><span>Email</span><input name="email" type="email" autocomplete="email" placeholder="name@example.com" required></label>
                        <label><span>Password</span><input name="password" type="password" autocomplete="${this.authView === "register" ? "new-password" : "current-password"}" placeholder="••••••••" required></label>
                        <button type="submit" class="studio-auth__submit">${this.authView === "register" ? "Create account" : "Sign in"}</button>
                    </form>
                    <small class="studio-auth__note">Authentication service is not connected in this development build.</small>
                    <button type="button" class="studio-auth__close" data-action="auth-close">Close</button>
                </section>
            </div>`;
    }

    openAuth() {
        this.authView = "signin";
        this.authOpen = true;
        this.render();
    }

    showTools() {
        this.open = true;
        this.render();
        this.element.querySelector(".studio-sidebar__tools")?.scrollIntoView({ block: "nearest" });
    }

    showConnectivity() {
        this.open = true;
        this.render();
        this.element.querySelector(".studio-sidebar__connectivity")?.scrollIntoView({ block: "nearest" });
    }

    bindEvents() {
        this.element.querySelector('[data-action="toggle"]')?.addEventListener("click", () => this.toggle());
        this.element.querySelectorAll("[data-section]").forEach(button => {
            button.addEventListener("click", () => {
                this.activeSection = button.dataset.section;
                this.open = true;
                this.render();
            });
        });

        this.element.querySelector('[data-action="mock-device"]')?.addEventListener("change", event => this.eventBus.emit(Events.MOCK_DEVICE_CHANGE_REQUEST, event.target.value));
        this.element.querySelector('[data-action="account-open"]')?.addEventListener("click", () => this.openAuth());
        this.element.querySelector('[data-action="reconnect"]')?.addEventListener("click", () => this.eventBus.emit(Events.DEVICE_RECONNECT_REQUEST));

        this.element.querySelectorAll('[data-action="midi-output"]').forEach(input => input.addEventListener("change", event => this.eventBus.emit(Events.CONNECTIVITY_REQUEST, { action: "midi-output", output: input.dataset.output, value: event.target.checked })));

        this.element.querySelector('[data-action="bluetooth-toggle"]')?.addEventListener("change", event => {
            this.eventBus.emit(Events.CONNECTIVITY_REQUEST, { action: "bluetooth-enabled", value: event.target.checked });
        });
        this.element.querySelector('[data-action="bluetooth-name"]')?.addEventListener("change", event => {
            this.eventBus.emit(Events.CONNECTIVITY_REQUEST, { action: "bluetooth-name", value: event.target.value });
        });

        this.element.querySelector('[data-action="undo"]')?.addEventListener("click", () => this.eventBus.emit(Events.CONFIGURATION_UNDO_REQUEST));
        this.element.querySelector('[data-action="redo"]')?.addEventListener("click", () => this.eventBus.emit(Events.CONFIGURATION_REDO_REQUEST));
        this.element.querySelector('[data-action="snapshot"]')?.addEventListener("click", () => this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, { action: "snapshot" }));
        this.element.querySelector('[data-action="restore-snapshot"]')?.addEventListener("click", () => this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, { action: "restore-snapshot" }));
        this.element.querySelector('[data-action="preset-save"]')?.addEventListener("click", () => this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, { action: "preset-save" }));
        this.element.querySelector('[data-action="preset-load"]')?.addEventListener("click", () => this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, { action: "preset-load" }));
        this.element.querySelector('[data-action="export"]')?.addEventListener("click", () => this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, { action: "export" }));
        this.element.querySelector('[data-action="validate"]')?.addEventListener("click", () => this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, { action: "validate" }));
        this.element.querySelector('[data-action="import"]')?.addEventListener("click", () => this.element.querySelector("[data-import-input]")?.click());
        this.element.querySelector("[data-import-input]")?.addEventListener("change", async event => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
                const payload = JSON.parse(await file.text());
                this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, { action: "import", payload });
            } catch {
                this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, { action: "error", message: "The selected file is not valid JSON." });
            }
            event.target.value = "";
        });

        this.bindAuthEvents();
    }

    bindAuthEvents() {
        this.element.querySelectorAll("[data-auth-view]").forEach(button => button.addEventListener("click", () => {
            this.authView = button.dataset.authView;
            this.authOpen = true;
            this.render();
        }));
        this.element.querySelectorAll('[data-action="auth-close"]').forEach(button => button.addEventListener("click", () => {
            this.authOpen = false;
            this.render();
        }));
        this.element.querySelector('[data-action="google"]')?.addEventListener("click", () => this.showAuthMessage("Google authentication will be connected when the bipoLab account service is implemented."));
        this.element.querySelector("[data-auth-form]")?.addEventListener("submit", event => {
            event.preventDefault();
            this.showAuthMessage("Account authentication is reserved for the bipoLab account service.");
        });
    }

    showAuthMessage(message) {
        const note = this.element.querySelector(".studio-auth__note");
        if (note) note.textContent = message;
    }
}

function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
