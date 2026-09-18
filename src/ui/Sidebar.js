import { Events } from "../core/Events.js";
import bipoCore from "../core/bipoCore.js";

export default class Sidebar {
    constructor(element, eventBus) {
        this.element = element;
        this.eventBus = eventBus;
        this.device = null;
        this.open = false;
        this.authView = "signin";
        this.eventBus.on(Events.SESSION_CHANGED, this.onSessionChanged.bind(this));
    }

    onSessionChanged(device) {
        this.device = device;
        this.render();
    }

    show() {
        this.render();
    }

    toggle() {
        this.open = !this.open;
        this.render();
    }

    render() {
        const devMode = Boolean(import.meta.env?.DEV);
        const devices = devMode ? bipoCore.getMockDevices() : [];
        this.element.innerHTML = `
            <button class="studio-menu-button" type="button" aria-label="Open bipoStudio menu" aria-expanded="${this.open}" data-action="toggle">
                <span></span><span></span><span></span>
            </button>
            <aside class="studio-sidebar ${this.open ? "is-open" : ""}" aria-label="bipoStudio menu">
                <div class="studio-sidebar__backdrop" data-action="close"></div>
                <section class="studio-sidebar__panel">
                    <header class="studio-sidebar__header">
                        <div>
                            <span class="section-label">bipoLab engineering</span>
                            <h2>bipoStudio</h2>
                        </div>
                        <button type="button" class="studio-sidebar__close" data-action="close" aria-label="Close menu">×</button>
                    </header>

                    <nav class="studio-sidebar__nav" aria-label="Studio navigation">
                        <button class="studio-sidebar__nav-item is-active" type="button">
                            <span>Studio</span><small>CONTROL CONFIGURATION</small>
                        </button>
                        <button class="studio-sidebar__nav-item" type="button" data-action="account">
                            <span>Account</span><small>SIGN IN / REGISTER</small>
                        </button>
                        <button class="studio-sidebar__nav-item" type="button">
                            <span>About bipoLab</span><small>ENGINEERING / PLATFORM</small>
                        </button>
                    </nav>

                    ${devMode ? `
                    <section class="studio-sidebar__section">
                        <span class="studio-sidebar__eyebrow">Development</span>
                        <label class="studio-sidebar__field">
                            <span>Mock controller</span>
                            <select data-action="mock-device">
                                ${devices.map(device => `<option value="${device.id}" ${device.id === this.device?.id ? "selected" : ""}>${device.name}</option>`).join("")}
                            </select>
                        </label>
                        <p>Development-only hardware emulation. Production bipoCore will identify the connected controller automatically.</p>
                    </section>` : ""}

                    <section class="studio-sidebar__account">
                        <span class="studio-sidebar__eyebrow">bipoLab account</span>
                        <h3>Sync your studio</h3>
                        <p>Save configurations and access your bipoLab devices from your account.</p>
                        <button class="studio-sidebar__account-button" type="button" data-action="account">Start session</button>
                    </section>

                    <footer class="studio-sidebar__footer">
                        <span>bipoLab / bipoStudio</span>
                        <span>${this.device?.firmware ?? "DEVICE OFFLINE"}</span>
                    </footer>
                </section>
            </aside>
            ${this.renderAuthModal()}
        `;

        this.bindEvents();
    }

    renderAuthModal() {
        if (!this.authView) return "";
        return `
            <div class="studio-auth ${this.authView === "hidden" ? "" : "is-hidden"}" data-auth-modal>
                <div class="studio-auth__backdrop" data-action="auth-close"></div>
                <section class="studio-auth__panel" role="dialog" aria-modal="true" aria-labelledby="studio-auth-title">
                    <span class="section-label">bipoLab account</span>
                    <h2 id="studio-auth-title">Start a session</h2>
                    <p>Account authentication will connect bipoStudio to your saved configurations and devices.</p>
                    <button type="button" class="studio-auth__google" data-action="google">
                        <span class="studio-auth__google-mark">G</span>
                        Continue with Google
                    </button>
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
        this.renderAuth();
    }

    renderAuth() {
        const current = this.element.querySelector("[data-auth-modal]");
        const html = this.renderAuthModal();
        if (!current) {
            this.render();
            return;
        }
        current.outerHTML = html;
        this.bindAuthEvents();
    }

    bindEvents() {
        this.element.querySelector('[data-action="toggle"]')?.addEventListener("click", () => this.toggle());
        this.element.querySelectorAll('[data-action="close"]').forEach(button => button.addEventListener("click", () => {
            this.open = false;
            this.render();
        }));
        this.element.querySelector('[data-action="mock-device"]')?.addEventListener("change", event => {
            this.eventBus.emit(Events.MOCK_DEVICE_CHANGE_REQUEST, event.target.value);
        });
        this.element.querySelectorAll('[data-action="account"]').forEach(button => button.addEventListener("click", () => this.openAuth()));
        this.bindAuthEvents();
    }

    bindAuthEvents() {
        this.element.querySelectorAll("[data-auth-view]").forEach(button => button.addEventListener("click", () => {
            this.authView = button.dataset.authView;
            this.renderAuth();
        }));
        this.element.querySelectorAll('[data-action="auth-close"]').forEach(button => button.addEventListener("click", () => {
            const modal = this.element.querySelector("[data-auth-modal]");
            modal?.classList.add("is-hidden");
        }));
        this.element.querySelector('[data-action="google"]')?.addEventListener("click", () => {
            this.showAuthMessage("Google authentication will be connected when the bipoLab account service is implemented.");
        });
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
