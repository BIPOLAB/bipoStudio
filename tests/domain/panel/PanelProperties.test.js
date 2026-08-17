import { describe, expect, it } from "vitest";

import PanelProperties from "../../../src/domain/panel/PanelProperties.js";
import Size from "../../../src/domain/geometry/Size.js";

describe("PanelProperties", () => {

    it("creates panel properties", () => {

        const properties = new PanelProperties({
            name: "MIMO-LAB",
            size: new Size(600, 240),
            background: "#111111",
            cornerRadius: 8
        });

        expect(properties.name).toBe("MIMO-LAB");
        expect(properties.size.width).toBe(600);
        expect(properties.size.height).toBe(240);
        expect(properties.background).toBe("#111111");
        expect(properties.cornerRadius).toBe(8);

    });

    it("provides sensible defaults", () => {

        const properties = new PanelProperties();

        expect(properties.name).toBe("");
        expect(properties.size).toBeInstanceOf(Size);
        expect(properties.size.width).toBe(0);
        expect(properties.size.height).toBe(0);
        expect(properties.background).toBe("transparent");
        expect(properties.cornerRadius).toBe(0);

    });

    it("rejects a negative corner radius", () => {

        expect(() => {

            new PanelProperties({
                cornerRadius: -1
            });

        }).toThrow();

    });

    it("compares equal properties", () => {

        const a = new PanelProperties({
            name: "LAB-16",
            size: new Size(500, 200),
            background: "#000000",
            cornerRadius: 6
        });

        const b = new PanelProperties({
            name: "LAB-16",
            size: new Size(500, 200),
            background: "#000000",
            cornerRadius: 6
        });

        expect(a.equals(b)).toBe(true);

    });

    it("compares different properties", () => {

        const a = new PanelProperties({
            name: "LAB-16"
        });

        const b = new PanelProperties({
            name: "MIMO-LAB"
        });

        expect(a.equals(b)).toBe(false);

    });

    it("creates an independent clone", () => {

        const properties = new PanelProperties({
            name: "Prophet-Lab",
            size: new Size(700, 300),
            background: "#202020",
            cornerRadius: 10
        });

        const clone = properties.clone();

        expect(clone).not.toBe(properties);
        expect(clone.size).not.toBe(properties.size);
        expect(clone.equals(properties)).toBe(true);

    });

    it("serializes to JSON", () => {

        const properties = new PanelProperties({
            name: "Ío-Lab",
            size: new Size(640, 280),
            background: "#181818",
            cornerRadius: 12
        });

        expect(properties.toJSON()).toEqual({
            name: "Ío-Lab",
            size: {
                width: 640,
                height: 280
            },
            background: "#181818",
            cornerRadius: 12
        });

    });

    it("deserializes from JSON", () => {

        const properties = PanelProperties.fromJSON({
            name: "Ambient Lab",
            size: {
                width: 320,
                height: 180
            },
            background: "#101010",
            cornerRadius: 5
        });

        expect(properties.name).toBe("Ambient Lab");
        expect(properties.size.width).toBe(320);
        expect(properties.size.height).toBe(180);
        expect(properties.background).toBe("#101010");
        expect(properties.cornerRadius).toBe(5);

    });

});