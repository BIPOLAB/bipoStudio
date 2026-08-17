import { describe, expect, it } from "vitest";

import LayoutItem from "../../../src/domain/layout/LayoutItem.js";
import Bounds from "../../../src/domain/geometry/Bounds.js";
import Position from "../../../src/domain/geometry/Position.js";
import Rotation from "../../../src/domain/geometry/Rotation.js";
import Size from "../../../src/domain/geometry/Size.js";

describe("LayoutItem", () => {

    function createBounds() {
        return new Bounds(
            new Position(10, 20),
            new Size(30, 40)
        );
    }

    it("creates a layout item", () => {

        const item = new LayoutItem(
            "K001",
            createBounds(),
            new Rotation(90)
        );

        expect(item.componentId).toBe("K001");
        expect(item.bounds.x).toBe(10);
        expect(item.rotation.degrees).toBe(90);

    });

    it("rejects an empty component id", () => {

        expect(() => {

            new LayoutItem("", createBounds());

        }).toThrow();

    });

    it("creates a new instance with different bounds", () => {

        const item = new LayoutItem(
            "K001",
            createBounds()
        );

        const moved = item.withBounds(
            new Bounds(
                new Position(100, 200),
                new Size(30, 40)
            )
        );

        expect(item.bounds.x).toBe(10);
        expect(moved.bounds.x).toBe(100);

    });

    it("creates a new instance with different rotation", () => {

        const item = new LayoutItem(
            "K001",
            createBounds()
        );

        const rotated = item.withRotation(
            new Rotation(180)
        );

        expect(item.rotation.degrees).toBe(0);
        expect(rotated.rotation.degrees).toBe(180);

    });

    it("compares equal layout items", () => {

        const a = new LayoutItem(
            "K001",
            createBounds(),
            new Rotation(90)
        );

        const b = new LayoutItem(
            "K001",
            createBounds(),
            new Rotation(90)
        );

        expect(a.equals(b)).toBe(true);

    });

    it("serializes to JSON", () => {

        const json = new LayoutItem(
            "K001",
            createBounds(),
            new Rotation(45)
        ).toJSON();

        expect(json.componentId).toBe("K001");
        expect(json.rotation.degrees).toBe(45);

    });

    it("deserializes from JSON", () => {

        const item = LayoutItem.fromJSON({

            componentId: "K010",

            bounds: {

                position: {
                    x: 1,
                    y: 2
                },

                size: {
                    width: 3,
                    height: 4
                }

            },

            rotation: {
                degrees: 90
            }

        });

        expect(item.componentId).toBe("K010");
        expect(item.bounds.width).toBe(3);
        expect(item.rotation.degrees).toBe(90);

    });

});