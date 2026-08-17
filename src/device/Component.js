import ComponentId from "./ComponentId.js";
import { isComponentType } from "./ComponentType.js";

/**
 * Describes one physical component. Its identity and type never change.
 */
export default class Component {

    constructor(data = {}) {

        if (!isComponentType(data.type)) {
            throw new Error(`Unsupported component type "${data.type}".`);
        }

        this.id = ComponentId.from(data.id).toString();
        this.type = data.type;
        this.label = String(data.label ?? data.name ?? this.id);
        this.position = this.normalizePosition(data.position);
        this.metadata = Object.freeze({ ...(data.metadata ?? {}) });

        Object.freeze(this.position);
        Object.freeze(this);

    }

    normalizePosition(position) {

        if (!position) {
            return null;
        }

        const x = Number(position.x);
        const y = Number(position.y);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new Error(`Invalid position for component "${this.id}".`);
        }

        return { x, y };

    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            label: this.label,
            position: this.position ? { ...this.position } : null,
            metadata: { ...this.metadata }
        };
    }

}
