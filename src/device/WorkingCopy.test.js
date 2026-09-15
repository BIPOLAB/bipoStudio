import { describe, expect, it } from "vitest";
import WorkingCopy from "./WorkingCopy.js";

const createConfiguration = (values) => ({
    toJSON: () => structuredClone(values)
});

describe("WorkingCopy", () => {
    it("starts with an isolated baseline and values", () => {
        const source = { K001: { number: 20 } };
        const copy = new WorkingCopy(createConfiguration(source));

        source.K001.number = 99;

        expect(copy.get("K001")).toEqual({ number: 20 });
        expect(copy.isDirty()).toBe(false);
    });

    it("updates component configuration without exposing internal state", () => {
        const copy = new WorkingCopy(createConfiguration({ K001: { number: 20 } }));
        const value = { number: 42, channel: 2 };

        copy.set("K001", value);
        value.number = 99;

        expect(copy.get("K001")).toEqual({ number: 42, channel: 2 });
        expect(copy.isDirty()).toBe(true);
    });

    it("restores a draft as an editable working state", () => {
        const copy = new WorkingCopy(createConfiguration({ K001: { number: 20 } }));
        const draft = { K001: { number: 64 } };

        copy.restoreDraft(draft);
        draft.K001.number = 100;

        expect(copy.get("K001")).toEqual({ number: 64 });
        expect(copy.isDirty()).toBe(true);
    });

    it("resets edits to the committed baseline", () => {
        const copy = new WorkingCopy(createConfiguration({ K001: { number: 20 } }));

        copy.set("K001", { number: 64 });
        copy.reset();

        expect(copy.get("K001")).toEqual({ number: 20 });
        expect(copy.isDirty()).toBe(false);
    });

    it("marks the current state as committed", () => {
        const copy = new WorkingCopy(createConfiguration({ K001: { number: 20 } }));

        copy.set("K001", { number: 64 });
        expect(copy.isDirty()).toBe(true);

        copy.markCommitted();

        expect(copy.isDirty()).toBe(false);
        expect(copy.get("K001")).toEqual({ number: 64 });
    });

    it("ignores invalid draft values", () => {
        const copy = new WorkingCopy(createConfiguration({ K001: { number: 20 } }));

        copy.restoreDraft(null);
        copy.restoreDraft("invalid");

        expect(copy.get("K001")).toEqual({ number: 20 });
        expect(copy.isDirty()).toBe(false);
    });
});
