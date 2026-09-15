import Inspector from "./Inspector.js";

const POT_RESOLUTIONS = [
    { bits: 7, max: 127, recommended: true },
    { bits: 8, max: 255, recommended: true },
    { bits: 9, max: 511, recommended: true },
    { bits: 10, max: 1023, recommended: true },
    { bits: 12, max: 4095, recommended: false },
    { bits: 14, max: 16383, recommended: false }
];

const RESOLUTION_BY_BITS = new Map(POT_RESOLUTIONS.map(option => [option.bits, option]));

export default class ResolutionInspector extends Inspector {
    renderControllerInspector(component) {
        const html = super.renderControllerInspector(component);
        if (component.type !== "knob" && component.type !== "fader") return html;

        const cfg = this.model.getComponentConfiguration(component.id) ?? {};
        const resolution = this.normalizeResolution(cfg.resolution);
        const option = RESOLUTION_BY_BITS.get(resolution);
        const max = Number(cfg.max ?? option.max);
        const warning = option.recommended ? "" : `<span class="inspector-resolution__warning">NOT RECOMMENDED</span>`;
        const control = `
            <style>
                .inspector-resolution{margin:18px 0 20px;padding:14px 0 2px;border-top:1px solid var(--color-border)}
                .inspector-resolution__header{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;font:700 9px/1 monospace;letter-spacing:.08em;text-transform:uppercase}
                .inspector-resolution__range{color:var(--color-text-muted);font-weight:400;letter-spacing:0}
                .inspector-resolution select{width:100%;min-height:34px;padding:0 9px;border:1px solid var(--color-border);border-radius:1px;background:var(--color-surface);color:var(--color-text);font:12px/1.2 var(--font-family)}
                .inspector-resolution__meta{display:flex;justify-content:space-between;gap:10px;margin-top:7px;font:9px/1.2 monospace;color:var(--color-text-muted)}
                .inspector-resolution__warning{color:var(--color-accent);font-weight:700;letter-spacing:.05em}
                .inspector-resolution .inspector-hint{margin-top:9px}
            </style>
            <div class="inspector-resolution">
                <div class="inspector-resolution__header">
                    <span>Resolution</span>
                    <span class="inspector-resolution__range">Full scale 0–${option.max}</span>
                </div>
                <select data-field="resolution" aria-label="Control resolution">
                    ${POT_RESOLUTIONS.map(item => `
                        <option value="${item.bits}" ${item.bits === resolution ? "selected" : ""}>
                            ${item.bits} bit${item.recommended ? "" : " · Not recommended"}
                        </option>`).join("")}
                </select>
                <div class="inspector-resolution__meta">
                    <span>Configured range 0–${max}</span>
                    ${warning}
                </div>
                <div class="inspector-hint">Higher resolutions provide finer values but can make analog noise more visible. 12-bit and 14-bit are available for advanced use.</div>
            </div>`;

        return html.replace(
            /(<div class="inspector-runtime">)/,
            `${control}$1`
        );
    }

    normalizeResolution(value) {
        const bits = Number(value);
        return RESOLUTION_BY_BITS.has(bits) ? bits : 10;
    }

    commitControllerField(component, field) {
        if (field.dataset.field !== "resolution") {
            super.commitControllerField(component, field);
            return;
        }

        const resolution = this.normalizeResolution(field.value);
        const option = RESOLUTION_BY_BITS.get(resolution);
        const cfg = this.model.getComponentConfiguration(component.id) ?? {};
        const currentMax = Number(cfg.max ?? 127);
        const currentResolution = this.normalizeResolution(cfg.resolution);
        const patch = { resolution };

        // Keep the range synchronized when the user is still using the
        // previous resolution's full-scale value. Custom ranges are preserved.
        const previousOption = RESOLUTION_BY_BITS.get(currentResolution);
        if (currentMax === previousOption?.max || cfg.max === undefined) {
            patch.max = option.max;
        }

        this.model.updateComponentConfiguration(component.id, patch);
    }
}
