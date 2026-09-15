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
            <div class="inspector-resolution">
                <div class="inspector-resolution__header">
                    <span>Resolution</span>
                    <span class="inspector-resolution__range">0–${option.max}</span>
                </div>
                <select data-field="resolution" aria-label="Control resolution">
                    ${POT_RESOLUTIONS.map(item => `
                        <option value="${item.bits}" ${item.bits === resolution ? "selected" : ""}>
                            ${item.bits} bit${item.recommended ? "" : " · Not recommended"}
                        </option>`).join("")}
                </select>
                <div class="inspector-resolution__meta">
                    <span>Value range 0–${max}</span>
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
