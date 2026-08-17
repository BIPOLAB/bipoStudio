import { describe, expect, it } from "vitest";

import Rotation from "../../../src/domain/geometry/Rotation.js";

describe("Rotation", () => {

    it("defaults to zero degrees", () => {

        const rotation = new Rotation();

        expect(rotation.degrees).toBe(0);

    });

    it("creates a rotation", () => {

        const rotation = new Rotation(90);

        expect(rotation.degrees).toBe(90);

    });

    it("normalizes values greater than 360", () => {

        const rotation = new Rotation(450);

        expect(rotation.degrees).toBe(90);

    });

    it("normalizes negative values", () => {

        const rotation = new Rotation(-90);

        expect(rotation.degrees).toBe(270);

    });

    it("returns radians", () => {

        const rotation = new Rotation(180);

        expect(rotation.radians).toBeCloseTo(Math.PI);

    });

    it("creates a rotated instance", () => {

        const rotation = new Rotation(90);

        const rotated = rotation.rotate(90);

        expect(rotated.degrees).toBe(180);

    });

    it("does not modify the original instance", () => {

        const rotation = new Rotation(90);

        rotation.rotate(90);

        expect(rotation.degrees).toBe(90);

    });

    it("compares equal rotations", () => {

        expect(
            new Rotation(90).equals(
                new Rotation(90)
            )
        ).toBe(true);

    });

    it("serializes to JSON", () => {

        expect(
            new Rotation(45).toJSON()
        ).toEqual({
            degrees: 45
        });

    });

    it("deserializes from JSON", () => {

        const rotation = Rotation.fromJSON({
            degrees: 180
        });

        expect(rotation.degrees).toBe(180);

    });

});