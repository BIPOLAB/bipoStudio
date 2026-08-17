import { describe, expect, it } from "vitest";

import Bounds from "../../../src/domain/geometry/Bounds.js";
import Position from "../../../src/domain/geometry/Position.js";
import Size from "../../../src/domain/geometry/Size.js";

describe("Bounds", () => {

    it("creates bounds", () => {

        const bounds = new Bounds(
            new Position(10, 20),
            new Size(30, 40)
        );

        expect(bounds.x).toBe(10);
        expect(bounds.y).toBe(20);
        expect(bounds.width).toBe(30);
        expect(bounds.height).toBe(40);

    });

    it("calculates edges", () => {

        const bounds = new Bounds(
            new Position(10, 20),
            new Size(30, 40)
        );

        expect(bounds.left).toBe(10);
        expect(bounds.top).toBe(20);
        expect(bounds.right).toBe(40);
        expect(bounds.bottom).toBe(60);

    });

    it("calculates center", () => {

        const bounds = new Bounds(
            new Position(10, 20),
            new Size(30, 40)
        );

        expect(bounds.centerX).toBe(25);
        expect(bounds.centerY).toBe(40);

    });

    it("contains an internal point", () => {

        const bounds = new Bounds(
            new Position(0, 0),
            new Size(100, 100)
        );

        expect(bounds.contains(50, 50)).toBe(true);

    });

    it("does not contain an external point", () => {

        const bounds = new Bounds(
            new Position(0, 0),
            new Size(100, 100)
        );

        expect(bounds.contains(150, 50)).toBe(false);

    });

    it("creates translated bounds", () => {

        const bounds = new Bounds(
            new Position(10, 20),
            new Size(30, 40)
        );

        const moved = bounds.translate(5, 10);

        expect(moved.x).toBe(15);
        expect(moved.y).toBe(30);

        expect(bounds.x).toBe(10);
        expect(bounds.y).toBe(20);

    });

    it("creates resized bounds", () => {

        const bounds = new Bounds(
            new Position(10, 20),
            new Size(30, 40)
        );

        const resized = bounds.resize(100, 200);

        expect(resized.width).toBe(100);
        expect(resized.height).toBe(200);

        expect(bounds.width).toBe(30);
        expect(bounds.height).toBe(40);

    });

    it("compares equal bounds", () => {

        const a = new Bounds(
            new Position(1, 2),
            new Size(3, 4)
        );

        const b = new Bounds(
            new Position(1, 2),
            new Size(3, 4)
        );

        expect(a.equals(b)).toBe(true);

    });

    it("serializes to JSON", () => {

        const json = new Bounds(
            new Position(10, 20),
            new Size(30, 40)
        ).toJSON();

        expect(json).toEqual({

            position: {
                x: 10,
                y: 20
            },

            size: {
                width: 30,
                height: 40
            }

        });

    });

    it("deserializes from JSON", () => {

        const bounds = Bounds.fromJSON({

            position: {
                x: 5,
                y: 6
            },

            size: {
                width: 7,
                height: 8
            }

        });

        expect(bounds.x).toBe(5);
        expect(bounds.y).toBe(6);
        expect(bounds.width).toBe(7);
        expect(bounds.height).toBe(8);

    });

});