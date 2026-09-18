/**
 * Editable configuration isolated from the configuration stored on device.
 *
 * The working copy also keeps a bounded undo/redo history so configuration
 * changes can be explored safely before they are committed to the device.
 */
export default class WorkingCopy {

    constructor(configuration) {
        this.values = configuration.toJSON();
        this.baseline = configuration.toJSON();
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistory = 80;
    }

    get(componentId) {
        return Object.hasOwn(this.values, componentId)
            ? structuredClone(this.values[componentId])
            : null;
    }

    set(componentId, value) {
        const next = structuredClone(value ?? {});
        const previous = this.get(componentId);
        if (JSON.stringify(previous) === JSON.stringify(next)) return false;

        this.pushUndo();
        this.values[componentId] = next;
        this.redoStack = [];
        return true;
    }

    restoreDraft(values) {
        if (!values || typeof values !== "object") return;
        this.values = structuredClone(values);
        this.undoStack = [];
        this.redoStack = [];
    }

    reset() {
        if (JSON.stringify(this.values) === JSON.stringify(this.baseline)) return false;
        this.pushUndo();
        this.values = structuredClone(this.baseline);
        this.redoStack = [];
        return true;
    }

    markCommitted() {
        this.baseline = structuredClone(this.values);
        this.undoStack = [];
        this.redoStack = [];
    }

    undo() {
        if (!this.undoStack.length) return false;
        this.redoStack.push(structuredClone(this.values));
        this.values = this.undoStack.pop();
        return true;
    }

    redo() {
        if (!this.redoStack.length) return false;
        this.undoStack.push(structuredClone(this.values));
        this.values = this.redoStack.pop();
        return true;
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    snapshot() {
        return {
            values: structuredClone(this.values),
            baseline: structuredClone(this.baseline),
            createdAt: new Date().toISOString()
        };
    }

    restoreSnapshot(snapshot) {
        if (!snapshot?.values || typeof snapshot.values !== "object") return false;
        this.values = structuredClone(snapshot.values);
        this.redoStack = [];
        return true;
    }

    isDirty() {
        return JSON.stringify(this.values) !== JSON.stringify(this.baseline);
    }

    toJSON() {
        return structuredClone(this.values);
    }

    pushUndo() {
        this.undoStack.push(structuredClone(this.values));
        if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    }

}
