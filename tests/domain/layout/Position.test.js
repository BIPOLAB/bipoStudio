import { describe, expect, it } from "vitest";

import Position from "../../../src/domain/geometry/Position.js";

describe("Position", () => {

    it("creates a position", () => {

        const position = new Position(10, 20);

        expect(position.x).toBe(10);
        expect(position.y).toBe(20);

    });

    it("defaults to origin", () => {

        const position = new Position();

        expect(position.x).toBe(0);
        expect(position.y).toBe(0);

    });

    it("creates a translated position", () => {

        const position = new Position(10, 20);

        const translated = position.translate(5, -10);

        expect(translated.x).toBe(15);
        expect(translated.y).toBe(10);

    });

    it("does not modify the original instance", () => {

        const position = new Position(10, 20);

        position.translate(100, 100);

        expect(position.x).toBe(10);
        expect(position.y).toBe(20);

    });

    it("compares equal positions", () => {

        expect(
            new Position(1, 2).equals(
                new Position(1, 2)
            )
        ).toBe(true);

    });

    it("compares different positions", () => {

        expect(
            new Position(1, 2).equals(
                new Position(2, 1)
            )
        ).toBe(false);

    });

    it("serializes to JSON", () => {

        const json = new Position(5, 8).toJSON();

        expect(json).toEqual({
            x: 5,
            y: 8
        });

    });

    it("deserializes from JSON", () => {

        const position = Position.fromJSON({
            x: 100,
            y: 200
        });

        expect(position.x).toBe(100);
        expect(position.y).toBe(200);

    });

});