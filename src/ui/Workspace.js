import { Events } from "../core/Events.js";

export default class Workspace {
    constructor(element, eventBus, selectionManager) {
        this.element = element;
        this.eventBus = eventBus;
        this.selectionManager = selectionManager;
        this.model = null;
        this.selectedComponentId = null;
        this.runtimeValues = {};
        this.eventBus.on(Events.DEVICE_MODEL_READY, this.onModelReady.bind(this));
        this.eventBus.on(Events.SELECTION_CHANGED, this.onSelectionChanged.bind(this));
        this.eventBus.on(Events.RUNTIME_CHANGED, this.onRuntimeChanged.bind(this));
        this.eventBus.on(Events.WORKING_COPY_CHANGED, this.onWorkingCopyChanged.bind(this));
        this.bindSelectionEvents();
    }

    bindSelectionEvents() {
        this.element.addEventListener("pointerdown", event => {
            const led = event.target.closest("[data-led-id]");
            if (!led || !this.element.contains(led)) return;
            event.preventDefault();
            event.stopPropagation();
            this.selectionManager.select(led.dataset.ledId);
        }, true);

        this.element.addEventListener("click", event => {
            const led = event.target.closest("[data-led-id]");
            if (!led || !this.element.contains(led)) return;
            event.preventDefault();
            event.stopPropagation();
        }, true);
    }

    onModelReady(model) {
        this.model = model;
        this.runtimeValues = model.runtime?.toJSON?.() ?? {};
        this.render();
    }

    onSelectionChanged(id) {
        this.selectedComponentId = id;
        this.updateSelectionVisuals();
    }

    onRuntimeChanged(payload = {}) {
        if (!payload.componentId) return;
        this.runtimeValues[payload.componentId] = payload.value;
        this.updateRuntimeVisual(payload.componentId);
    }

    onWorkingCopyChanged(payload = {}) {
        if (payload.componentId) this.updateLedVisual(payload.componentId);
        else this.render();
    }

    render() {
        if (!this.model?.hardware) {
            this.element.innerHTML = `<div class="waiting">Waiting for a bipoLab device...</div>`;
            return;
        }

        const components = this.model.hardware.getComponents();
        const name = this.model.device.name;
        const kind = components[0]?.type;
        const surfaceClass = kind === "fader"
            ? "device-panel--faders"
            : kind === "button" || kind === "switch"
                ? "device-panel--buttons"
                : "device-panel--knobs";
        const gridClass = kind === "fader"
            ? "device-grid device-grid--faders"
            : "device-grid device-grid--4x4";
        const label = kind === "knob"
            ? "POTENTIOMETERS"
            : kind === "button" || kind === "switch"
                ? "BUTTONS"
                : "FADERS";

        this.element.innerHTML = `
            <section class="device-workspace">
                <div class="device-panel ${surfaceClass}">
                    <header class="device-panel__header">
                        <div>
                            <span class="section-label">bipoLab engineering</span>
                            <h1>${name}</h1>
                        </div>
                        <span class="device-workspace__mode">CONFIGURATION · MOCK</span>
                    </header>
                    <div class="${gridClass}" aria-label="${name} controls">
                        ${components.map(component => this.renderComponent(component)).join("")}
                    </div>
                    <footer class="device-panel__footer">
                        <span>${components.length} ${label}</span>
                        <span>${kind === "fader" ? "4 × 1" : "4 × 4"}</span>
                    </footer>
                </div>
            </section>`;

        this.bindComponentEvents();
        this.updateSelectionVisuals();
    }

    renderComponent(component) {
        const controllerSelected = component.id === this.selectedComponentId;
        const ledId = `${component.id}-LED`;
        const ledSelected = ledId === this.selectedComponentId;
        const value = Math.round(this.getRuntimeValue(component.id));
        const cfg = this.model.getComponentConfiguration(component.id) ?? {};
        const led = cfg.led ?? {
            id: ledId,
            mode: "static",
            color: { r: 255, g: 255, b: 255 },
            brightness: 100
        };
        const rgb = led.color ?? { r: 255, g: 255, b: 255 };
        const alpha = Math.max(0, Math.min(1, Number(led.brightness ?? 100) / 100));
        const ledStyle = `--led-r:${rgb.r};--led-g:${rgb.g};--led-b:${rgb.b};--led-a:${alpha}`;

        return `
            <div class="device-cell">
                <div class="device-cell__controller ${controllerSelected ? "is-selected" : ""}">
                    <div class="device-control device-control--${component.type}" data-component-id="${component.id}" tabindex="0" role="button" title="${component.label}" aria-label="Configure ${component.label}" aria-valuemin="0" aria-valuemax="127" aria-valuenow="${value}">
                        <span class="device-control__visual" style="--runtime-value:${value}"></span>
                    </div>
                </div>
                <div class="device-cell__led ${ledSelected ? "is-selected" : ""}" data-led-id="${ledId}" data-led-component="${component.id}" title="Configure ${ledId}" role="button" tabindex="0" aria-label="Configure LED ${ledId}">
                    <span class="device-control__led ${ledSelected ? "device-control__led--selected" : ""}" style="${ledStyle}"></span>
                </div>
            </div>`;
    }

    bindComponentEvents() {
        this.element.querySelectorAll("[data-component-id]").forEach(control => {
            const id = control.dataset.componentId;
            const component = this.model.getComponent(id);
            const configuration = this.model.getComponentConfiguration(id) ?? {};
            const isButton = component?.type === "switch" || component?.type === "button";
            const isContinuous = component?.type === "knob" || component?.type === "fader";

            control.addEventListener("click", () => this.selectionManager.select(id));
            control.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    this.selectionManager.select(id);
                    if (isButton && (configuration.mode ?? configuration.buttonMode ?? "momentary") === "toggle") {
                        this.setRuntimeValue(id, this.getRuntimeValue(id) > 0 ? 0 : 127);
                    }
                    return;
                }

                if (!isContinuous) return;

                const current = this.getRuntimeValue(id);
                const step = event.shiftKey ? 10 : 1;
                if (event.key === "ArrowUp" || event.key === "ArrowRight") {
                    event.preventDefault();
                    this.setRuntimeValue(id, current + step);
                } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    this.setRuntimeValue(id, current - step);
                } else if (event.key === "Home") {
                    event.preventDefault();
                    this.setRuntimeValue(id, 0);
                } else if (event.key === "End") {
                    event.preventDefault();
                    this.setRuntimeValue(id, 127);
                }
            });

            if (isContinuous) {
                let dragging = false;
                let lastY = 0;
                control.addEventListener("pointerdown", event => {
                    dragging = true;
                    lastY = event.clientY;
                    control.setPointerCapture?.(event.pointerId);
                    this.selectionManager.select(id);
                    event.preventDefault();
                });
                control.addEventListener("pointermove", event => {
                    if (!dragging) return;
                    const delta = lastY - event.clientY;
                    lastY = event.clientY;
                    const multiplier = component.type === "fader" ? 1.2 : 0.8;
                    this.setRuntimeValue(id, this.getRuntimeValue(id) + delta * multiplier);
                    event.preventDefault();
                });
                control.addEventListener("wheel", event => {
                    event.preventDefault();
                    this.selectionManager.select(id);
                    const direction = event.deltaY < 0 ? 1 : -1;
                    const step = event.shiftKey ? 10 : 2;
                    this.setRuntimeValue(id, this.getRuntimeValue(id) + direction * step);
                }, { passive: false });
                control.addEventListener("dblclick", event => {
                    event.preventDefault();
                    this.setRuntimeValue(id, 0);
                });
                const stop = event => {
                    dragging = false;
                    control.releasePointerCapture?.(event.pointerId);
                };
                control.addEventListener("pointerup", stop);
                control.addEventListener("pointercancel", stop);
            }

            if (isButton) {
                const mode = configuration.mode ?? configuration.buttonMode ?? "momentary";
                if (mode === "toggle") {
                    control.addEventListener("click", () => this.setRuntimeValue(id, this.getRuntimeValue(id) > 0 ? 0 : 127));
                } else {
                    control.addEventListener("pointerdown", event => {
                        this.setRuntimeValue(id, 127);
                        control.setPointerCapture?.(event.pointerId);
                    });
                    const release = event => {
                        this.setRuntimeValue(id, 0);
                        control.releasePointerCapture?.(event.pointerId);
                    };
                    control.addEventListener("pointerup", release);
                    control.addEventListener("pointercancel", release);
                }
            }
        });
    }

    updateSelectionVisuals() {
        this.element.querySelectorAll("[data-component-id]").forEach(control => {
            const selected = control.dataset.componentId === this.selectedComponentId;
            control.closest(".device-cell__controller")?.classList.toggle("is-selected", selected);
        });
        this.element.querySelectorAll("[data-led-id]").forEach(led => {
            const selected = led.dataset.ledId === this.selectedComponentId;
            led.classList.toggle("is-selected", selected);
            led.querySelector(".device-control__led")?.classList.toggle("device-control__led--selected", selected);
        });
    }

    getRuntimeValue(id) {
        return Number(this.runtimeValues[id] ?? 0);
    }

    setRuntimeValue(id, value) {
        const normalized = Math.round(Math.min(127, Math.max(0, Number(value) || 0)));
        this.runtimeValues[id] = normalized;
        this.model?.setRuntimeValue(id, normalized);
        const control = this.element.querySelector(`[data-component-id="${id}"]`);
        control?.setAttribute("aria-valuenow", normalized);
    }

    updateRuntimeVisual(id) {
        const control = this.element.querySelector(`[data-component-id="${id}"]`);
        if (!control) return;
        const value = this.getRuntimeValue(id);
        control.querySelector(".device-control__visual")?.style.setProperty("--runtime-value", value);
        control.setAttribute("aria-valuenow", value);
    }

    updateLedVisual(id) {
        const control = this.element.querySelector(`[data-component-id="${id}"]`);
        if (!control) return;
        const cfg = this.model.getComponentConfiguration(id) ?? {};
        const led = cfg.led ?? {};
        const rgb = led.color ?? { r: 255, g: 255, b: 255 };
        const alpha = Math.max(0, Math.min(1, Number(led.brightness ?? 100) / 100));
        const element = control.closest(".device-cell")?.querySelector("[data-led-id]");
        if (!element) return;
        const visual = element.querySelector(".device-control__led");
        if (!visual) return;
        visual.style.setProperty("--led-r", rgb.r);
        visual.style.setProperty("--led-g", rgb.g);
        visual.style.setProperty("--led-b", rgb.b);
        visual.style.setProperty("--led-a", alpha);
    }
}
