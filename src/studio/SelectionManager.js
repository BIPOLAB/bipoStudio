import { Events } from "../core/Events.js";

export default class SelectionManager {

    constructor(eventBus, uiState) {
        this.eventBus = eventBus;
        this.uiState = uiState;
    }

    select(componentId) {

        const normalizedId = String(componentId ?? "").trim();

        if (!normalizedId || this.uiState.selectedComponentId === normalizedId) {
            return;
        }

        this.uiState.selectedComponentId = normalizedId;
        this.eventBus.emit(Events.SELECTION_CHANGED, normalizedId);

    }

    clear() {

        if (this.uiState.selectedComponentId === null) {
            return;
        }

        this.uiState.selectedComponentId = null;
        this.eventBus.emit(Events.SELECTION_CHANGED, null);

    }

}
