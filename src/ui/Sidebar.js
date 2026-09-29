import { Events } from "../core/Events.js";
import bipoCore from "../core/bipoCore.js";

export default class Sidebar {
    constructor(element, eventBus, firebase = null) {
        this.element = element;
        this.eventBus = eventBus;
        this.firebase = firebase;
        this.authUser = firebase?.user ?? null;
        this.device = null;
        this.model = null;
        this.connectivity = null;
        this.open = false;
        this.activeSection = "studio";
        this.authView = "signin";
        this.authOpen = false;
        this.profileMessage = "";
        this.presetManagerOpen = false;
        this.presetManagerView = "mine";
        this.presetManagerData = [];
        this.presetManagerLoading = false;
        this.presetManagerCategory = "";
        this.presetSaveOpen = false;
        this.availablePresets = [];
        this.availablePresetsLoading = false;
        this.availablePresetsMessage = "";
        this.eventBus.on(Events.SESSION_CHANGED, this.onSessionChanged.bind(this));
        this.eventBus.on(Events.DEVICE_MODEL_READY, model => {
            this.model = model;
            this.connectivity = model.getConnectivity?.() ?? null;
            this.refreshAvailablePresets();
            this.render();
        });
        this.eventBus.on(Events.CONNECTIVITY_CHANGED, connectivity => {
            this.connectivity = connectivity;
            this.render();
        });
        this.eventBus.on(Events.WORKING_COPY_CHANGED, () => this.render());
        this.eventBus.on(Events.AUTH_CHANGED, user => {
            this.authUser = user;
            this.authOpen = false;
            if (user) this.refreshAvailablePresets();
            else {
                this.availablePresets = [];
                this.availablePresetsMessage = "";
            }
            this.render();
        });
        this.eventBus.on(Events.AUTH_ERROR, error => {
            this.showAuthMessage(this.authMessage(error));
        });
    }

    onSessionChanged(device) {
        this.device = device;
        this.connectivity = device?.connectivity ?? this.connectivity;
        this.render();
    }

    async refreshAvailablePresets() {
        if (!this.authUser || !this.firebase?.isConfigured()) {
            this.availablePresets = [];
            this.availablePresetsLoading = false;
            return;
        }

        this.availablePresetsLoading = true;
        this.availablePresetsMessage = "";
        this.render();

        try {
            this.availablePresets = await this.firebase.listCommunityPresets(null, this.device?.id ?? this.model?.device?.id ?? null);
        } catch (error) {
            this.availablePresets = [];
            this.availablePresetsMessage = this.authMessage(error);
        } finally {
            this.availablePresetsLoading = false;
            this.render();
        }
    }

    renderAvailablePresets() {
        if (!this.authUser) {
            return '<p class="studio-sidebar__hint">Sign in to see presets shared by the bipoLab community.</p>';
        }
        if (this.availablePresetsLoading) {
            return '<div class="studio-sidebar__preset-list"><div class="studio-sidebar__preset-empty">Loading shared presets…</div></div>';
        }
        if (this.availablePresetsMessage) {
            return '<div class="studio-sidebar__preset-list"><div class="studio-sidebar__preset-empty">' + escapeHtml(this.availablePresetsMessage) + '</div></div>';
        }
        if (!this.availablePresets.length) {
            return '<div class="studio-sidebar__preset-list"><div class="studio-sidebar__preset-empty">No shared presets for this controller yet.</div></div>';
        }

        return '<div class="studio-sidebar__preset-list">' +
            this.availablePresets.map(preset =>
                '<button type="button" class="studio-sidebar__preset-item" data-available-preset="' + escapeHtml(preset.id) + '">' +
                    '<span class="studio-sidebar__preset-item-main">' +
                        '<strong>' + escapeHtml(preset.name) + '</strong>' +
                        '<small>' + escapeHtml(preset.category || "DAW") + ' · ' + escapeHtml(preset.model || this.device?.name || "bipoLab preset") + '</small>' +
                        '<em>by ' + escapeHtml(preset.ownerName || "bipoLab user") + '</em>' +
                    '</span>' +
                    '<span class="studio-sidebar__preset-load" aria-hidden="true">LOAD</span>' +
                '</button>'
            ).join("") +
        '</div>';
    }

    show() {
        this.open = true;
        this.render();
    }

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
            studio: { index: "01", title: "Studio", subtitle: "CONTROL CONFIGURATION" },
            connectivity: { index: "02", title: "Connectivity", subtitle: "USB / BLUETOOTH MIDI" },
            tools: { index: "03", title: "Tools", subtitle: "DEVELOPER MODE" },
            account: { index: "04", title: "Account", subtitle: "SIGN IN / PROFILE" }
        };
        const activeMeta = sectionMeta[this.activeSection] ?? sectionMeta.studio;

        const navItem = (section, index, icon, title) =>
            '<button class="studio-sidebar__nav-item ' + (this.activeSection === section ? "is-active" : "") + '" type="button" title="' + title + '" data-section="' + section + '" aria-current="' + (this.activeSection === section ? "page" : "false") + '">' +
                '<span class="studio-sidebar__nav-index">' + index + '</span>' +
                '<span class="studio-sidebar__icon" aria-hidden="true">' + icon + '</span>' +
                '<span class="studio-sidebar__nav-copy"><strong>' + title + '</strong></span>' +
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
                    '<div class="studio-sidebar__panel-heading"><span class="studio-sidebar__eyebrow">bipoLab account</span><h2>Your account</h2><p>Manage your identity and cloud preset library.</p></div>' +
                    (this.authUser ? this.renderProfileCard() : '<div class="studio-account-card"><div class="studio-account-avatar">B</div><div class="studio-account-card__identity"><strong>Guest user</strong><span>Not signed in</span><small>Sign in to enable cloud presets.</small></div></div>') +
                    (this.authUser ? '<div class="studio-sidebar__subheading">Cloud library</div><div class="studio-sidebar__tool-grid"><button type="button" data-action="preset-library">My presets</button><button type="button" data-action="community-library">Community</button></div><button class="studio-sidebar__wide-button" type="button" data-action="account-signout">Sign out</button>' : '<button class="studio-sidebar__wide-button studio-sidebar__wide-button--primary" type="button" data-action="account-open">Sign in / Create account</button>') +
                    '<p class="studio-sidebar__hint">' + (this.authUser ? "Presets are stored in Firebase. Nothing is saved to browser local storage." : "Sign in to save presets and access the community library.") + '</p>' +
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
                    '<div class="studio-sidebar__panel-heading"><span class="studio-sidebar__eyebrow">Studio</span><h2>Configuration</h2><p>Manage the current device configuration, cloud presets and backups.</p></div>' +
                    '<div class="studio-sidebar__subheading">History</div>' +
                    '<div class="studio-sidebar__tool-grid"><button type="button" data-action="undo" ' + (this.model?.canUndo?.() ? "" : "disabled") + '>Undo</button><button type="button" data-action="redo" ' + (this.model?.canRedo?.() ? "" : "disabled") + '>Redo</button></div>' +
                    '<div class="studio-sidebar__subheading">Snapshots & presets</div>' +
                    '<div class="studio-sidebar__tool-grid"><button type="button" data-action="snapshot">Snapshot</button><button type="button" data-action="restore-snapshot">Restore</button><button type="button" data-action="preset-save">Save preset</button><button type="button" data-action="preset-load">Load preset</button></div>' +
                    (this.authUser ? '<div class="studio-sidebar__subheading">Available presets</div>' + this.renderAvailablePresets() : "") +
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
                    '<div class="studio-sidebar__brand"><span class="section-label">bipoLab engineering</span><div class="studio-sidebar__active-title"><span>' + activeMeta.index + '</span><strong>' + activeMeta.title + '</strong></div><small>' + activeMeta.subtitle + '</small></div>' +
                '</header>' +
                '<nav class="studio-sidebar__nav" aria-label="Studio navigation">' +
                    navItem("studio", "01", "▦", "Studio") +
                    navItem("connectivity", "02", "⌁", "Connectivity") +
                    (devMode ? navItem("tools", "03", "⚙", "Tools") : "") +
                    navItem("account", "04", "◎", "Account") +
                '</nav>' +
                '<div class="studio-sidebar__content">' + content + '</div>' +
                '<footer class="studio-sidebar__footer"><span>bipoLab / bipoStudio</span><span>' + (this.device?.firmware ?? "DEVICE OFFLINE") + '</span></footer>' +
            '</aside>' +
            this.renderAuthModal() + this.renderPresetManagerModal() + this.renderPresetSaveModal();

        this.bindEvents();
    }

    renderProfileCard() {
        const avatar = this.authUser?.photoURL
            ? '<img src="' + escapeHtml(this.authUser.photoURL) + '" alt="" class="studio-account-avatar__image">'
            : escapeHtml((this.authUser?.displayName || this.authUser?.email || "b").slice(0, 1).toUpperCase());
        return '<div class="studio-account-card"><label class="studio-account-avatar studio-account-avatar--editable" title="Custom avatar uploads are disabled">' + avatar + '<input type="file" accept="image/*" data-action="avatar-input" hidden></label><div class="studio-account-card__identity"><strong>' + escapeHtml(this.authUser?.displayName || "bipoLab user") + '</strong><span>' + escapeHtml(this.authUser?.email || "") + '</span><small>' + (this.authUser?.emailVerified ? "Email verified · Cloud sync active" : "Signed in · Verify your email in Firebase") + '</small></div></div><div class="studio-profile-editor"><label class="studio-sidebar__field"><span>User name</span><input type="text" maxlength="80" value="' + escapeHtml(this.authUser?.displayName || "") + '" data-action="profile-name"></label><button class="studio-sidebar__wide-button studio-sidebar__wide-button--primary" type="button" data-action="profile-save">Save profile</button>' + (this.profileMessage ? '<small class="studio-sidebar__hint">' + escapeHtml(this.profileMessage) + '</small>' : '') + '</div>';
    }

    async openPresetManager(view = "mine", category = this.presetManagerCategory) {
        if (!this.authUser || !this.firebase?.isConfigured()) return;
        this.presetManagerView = view;
        this.presetManagerCategory = category || "";
        this.presetManagerOpen = true;
        this.presetManagerLoading = true;
        this.render();
        try {
            this.presetManagerData = view === "mine"
                ? await this.firebase.listPresets()
                : await this.firebase.listCommunityPresets(this.presetManagerCategory || null, this.device?.id ?? this.model?.device?.id ?? null);
        } catch (error) {
            this.presetManagerData = [];
            this.profileMessage = this.authMessage(error);
        }
        this.presetManagerLoading = false;
        this.render();
    }

    openPresetSaveModal() {
        if (!this.authUser || !this.firebase?.isConfigured()) {
            this.openAuth();
            return;
        }
        this.presetSaveOpen = true;
        this.render();
        this.element.querySelector("[data-preset-save-form] input")?.focus();
    }

    renderPresetSaveModal() {
        if (!this.presetSaveOpen) return "";
        return '<div class="studio-library studio-preset-save"><div class="studio-auth__backdrop" data-action="preset-save-close"></div><section class="studio-library__panel studio-preset-save__panel" role="dialog" aria-modal="true"><header><div><span class="studio-sidebar__eyebrow">bipoLab cloud</span><h2>Save preset</h2></div><button type="button" data-action="preset-save-close">×</button></header><form data-preset-save-form><label class="studio-sidebar__field"><span>Preset name</span><input name="name" maxlength="40" required placeholder="My preset"></label><label class="studio-sidebar__field"><span>Category</span><select name="category"><option>DAW</option><option>Sequencer</option><option>Synth</option><option>Drums</option></select></label><label class="studio-sidebar__switch studio-preset-save__share"><span>Share with community</span><input name="shared" type="checkbox"><span class="studio-sidebar__switch-ui" aria-hidden="true"></span></label><p class="studio-sidebar__hint">Private presets remain visible only to your account. Sharing publishes a copy to the community library.</p><div class="studio-preset-save__actions"><button type="button" data-action="preset-save-close">Cancel</button><button class="studio-sidebar__wide-button--primary" type="submit">Save to Firebase</button></div></form></section></div>';
    }

    renderPresetManagerModal() {
        if (!this.presetManagerOpen) return "";
        const categories = ["DAW", "Sequencer", "Synth", "Drums"];
        const body = this.presetManagerLoading ? '<div class="studio-library__loading">Loading cloud library…</div>' :
            (this.presetManagerData.length ? this.presetManagerData.map(preset =>
                '<article class="studio-library__item"><div class="studio-library__identity"><strong>' + escapeHtml(preset.name) + '</strong><span>' + escapeHtml(preset.model || "bipoLab preset") + ' · ' + escapeHtml(preset.category || "DAW") + '</span>' +
                (this.presetManagerView === "community" ? '<small>by ' + escapeHtml(preset.ownerName || "bipoLab user") + '</small>' : '<small>' + (preset.shared ? "Shared with community" : "Private preset") + '</small>') +
                '</div><div class="studio-library__actions">' +
                (this.presetManagerView === "mine" ? '<select data-preset-category="' + preset.id + '">' + categories.map(category => '<option value="' + category + '" ' + (category === (preset.category || "DAW") ? "selected" : "") + '>' + category + '</option>').join("") + '</select><button type="button" data-preset-share="' + preset.id + '">' + (preset.shared ? "Unshare" : "Share") + '</button>' :
                '<button type="button" data-preset-load-community="' + preset.id + '">Load</button>') +
                '</div></article>').join("") : '<div class="studio-library__empty">No presets in this library yet.</div>');
        return '<div class="studio-library" data-preset-modal><div class="studio-auth__backdrop" data-action="preset-close"></div><section class="studio-library__panel" role="dialog" aria-modal="true"><header><div><span class="studio-sidebar__eyebrow">bipoLab cloud</span><h2>' + (this.presetManagerView === "mine" ? "My presets" : "Community presets") + '</h2></div><button type="button" data-action="preset-close">×</button></header><nav><button type="button" class="' + (this.presetManagerView === "mine" ? "is-active" : "") + '" data-library-view="mine">My presets</button><button type="button" class="' + (this.presetManagerView === "community" ? "is-active" : "") + '" data-library-view="community">Community</button></nav><div class="studio-library__filters"><label>Category<select data-library-category><option value="">All categories</option><option value="DAW">DAW</option><option value="Sequencer">Sequencer</option><option value="Synth">Synth</option><option value="Drums">Drums</option></select></label></div><div class="studio-library__list">' + body + '</div></section></div>';
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
                    <small class="studio-auth__note">Authentication is connected through Firebase Authentication.</small>
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
        this.element.querySelector('[data-action="preset-library"]')?.addEventListener("click", () => this.openPresetManager("mine"));
        this.element.querySelector('[data-action="preset-save"]')?.addEventListener("click", () => this.openPresetSaveModal());
        this.element.querySelector('[data-action="community-library"]')?.addEventListener("click", () => this.openPresetManager("community"));
        this.element.querySelectorAll('[data-action="preset-close"]').forEach(button => button.addEventListener("click", () => { this.presetManagerOpen = false; this.render(); }));
        this.element.querySelectorAll('[data-action="preset-save-close"]').forEach(button => button.addEventListener("click", () => { this.presetSaveOpen = false; this.render(); }));
        this.element.querySelector("[data-preset-save-form]")?.addEventListener("submit", event => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            this.presetSaveOpen = false;
            this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, {
                action: "preset-save-data",
                payload: { name: String(data.get("name") ?? ""), category: String(data.get("category") ?? "DAW"), shared: data.get("shared") === "on" }
            });
            this.render();
        });
        this.element.querySelectorAll("[data-library-view]").forEach(button => button.addEventListener("click", () => this.openPresetManager(button.dataset.libraryView)));
        this.element.querySelector("[data-library-category]")?.addEventListener("change", () => {
            this.presetManagerCategory = this.element.querySelector("[data-library-category]")?.value ?? "";
            this.openPresetManager(this.presetManagerView, this.presetManagerCategory);
        });
        this.element.querySelectorAll("[data-preset-delete]").forEach(button => button.addEventListener("click", async () => {
            if (!window.confirm("Delete this preset permanently from Firebase?")) return;
            try { await this.firebase.deletePreset(button.dataset.presetDelete); await this.openPresetManager("mine"); }
            catch (error) { this.profileMessage = this.authMessage(error); this.render(); }
        }));
        this.element.querySelectorAll("[data-preset-share]").forEach(button => button.addEventListener("click", async () => {
            const preset = this.presetManagerData.find(item => item.id === button.dataset.presetShare);
            if (!preset) return;
            try { await this.firebase.updatePreset(preset.id, { shared: !preset.shared }); await this.openPresetManager("mine"); }
            catch (error) { this.profileMessage = this.authMessage(error); this.render(); }
        }));
        this.element.querySelectorAll("[data-preset-category]").forEach(select => select.addEventListener("change", async event => {
            try { await this.firebase.updatePreset(select.dataset.presetCategory, { category: event.target.value }); await this.openPresetManager("mine"); }
            catch (error) { this.profileMessage = this.authMessage(error); this.render(); }
        }));
        this.element.querySelectorAll("[data-preset-load-community]").forEach(button => button.addEventListener("click", () => {
            const preset = this.presetManagerData.find(item => item.id === button.dataset.presetLoadCommunity);
            if (preset) {
                this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, { action: "preset-load-data", payload: preset.configuration });
                this.presetManagerOpen = false;
                this.render();
            }
        }));

        this.element.querySelectorAll("[data-available-preset]").forEach(button => button.addEventListener("click", () => {
            const preset = this.availablePresets.find(item => item.id === button.dataset.availablePreset);
            if (!preset) return;
            this.eventBus.emit(Events.CONFIGURATION_TOOLS_REQUEST, {
                action: "preset-load-data",
                payload: preset.configuration
            });
        }));
        this.element.querySelector('[data-action="avatar-input"]')?.addEventListener("change", () => {
            this.profileMessage = "Custom avatar uploads are disabled. Profile data and presets are stored in Firestore.";
            this.render();
        });
        this.element.querySelector('[data-action="profile-save"]')?.addEventListener("click", async () => {
            try { await this.firebase.saveProfile({ displayName: this.element.querySelector('[data-action="profile-name"]')?.value ?? "" }); this.profileMessage = "Profile updated."; }
            catch (error) { this.profileMessage = this.authMessage(error); }
            this.render();
        });

        this.element.querySelector('[data-action="account-signout"]')?.addEventListener("click", async () => {
            try { await this.firebase?.signOut(); } catch (error) { this.showAuthMessage(this.authMessage(error)); }
        });
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
        this.element.querySelector('[data-action="google"]')?.addEventListener("click", async () => {
            if (!this.firebase?.isConfigured()) {
                this.showAuthMessage("Firebase is not configured. Add the VITE_FIREBASE_* variables.");
                return;
            }
            try {
                await this.firebase.signInWithGoogle();
            } catch (error) {
                this.showAuthMessage(this.authMessage(error));
            }
        });
        this.element.querySelector("[data-auth-form]")?.addEventListener("submit", async event => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const email = String(data.get("email") ?? "");
            const password = String(data.get("password") ?? "");
            const name = String(data.get("name") ?? "");

            if (!this.firebase?.isConfigured()) {
                this.showAuthMessage("Firebase is not configured. Add the VITE_FIREBASE_* variables.");
                return;
            }

            try {
                if (this.authView === "register") {
                    await this.firebase.register(email, password, name);
                } else {
                    await this.firebase.signIn(email, password);
                }
            } catch (error) {
                this.showAuthMessage(this.authMessage(error));
            }
        });
    }

    showAuthMessage(message) {
        const note = this.element.querySelector(".studio-auth__note");
        if (note) note.textContent = message;
    }

    authMessage(error) {
        const messages = {
            "auth/invalid-credential": "Email or password is incorrect.",
            "auth/user-not-found": "No account was found for this email.",
            "auth/wrong-password": "Email or password is incorrect.",
            "auth/email-already-in-use": "An account already exists for this email.",
            "auth/weak-password": "Password is too weak.",
            "auth/popup-closed-by-user": "The sign-in window was closed.",
            "auth/popup-blocked": "The browser blocked the sign-in window.",
            "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase.",
            "auth/network-request-failed": "Firebase network request failed."
        };
        return messages[error?.code] ?? error?.message ?? String(error ?? "Authentication error.");
    }
}

function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
