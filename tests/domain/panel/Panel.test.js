import { describe, expect, it } from "vitest";

import Panel from "../../../src/domain/panel/Panel.js";
import PanelProperties from "../../../src/domain/panel/PanelProperties.js";
import PanelLayout from "../../../src/domain/layout/PanelLayout.js";
import LayoutItem from "../../../src/domain/layout/LayoutItem.js";
import Bounds from "../../../src/domain/geometry/Bounds.js";
import Position from "../../../src/domain/geometry/Position.js";
import Rotation from "../../../src/domain/geometry/Rotation.js";
import Size from "../../../src/domain/geometry/Size.js";

describe("Panel", () => {

    function createProperties() {
        return new PanelProperties({
            name: "MIMO-LAB",
            size: new Size(600, 240),
            background: "#111111",
            cornerRadius: 8
        });
    }

    function createLayout() {

        const layout = new PanelLayout();

        layout.add(
            new LayoutItem(
                "K001",
                new Bounds(
                    new Position(40, 50),
                    new Size(32, 32)
                ),
                new Rotation(0)
            )
        );

        return layout;

    }

    it("creates a panel", () => {

        const panel = new Panel(
            createProperties(),
            createLayout()
        );

        expect(panel.properties.name).toBe("MIMO-LAB");
        expect(panel.layout.size).toBe(1);

    });

    it("rejects invalid properties", () => {

        expect(() => {

            new Panel({}, createLayout());

        }).toThrow(TypeError);

    });

    it("rejects an invalid layout", () => {

        expect(() => {

            new Panel(createProperties(), []);

        }).toThrow(TypeError);

    });

    it("creates an independent clone", () => {

        const panel = new Panel(
            createProperties(),
            createLayout()
        );

        const clone = panel.clone();

        expect(clone).not.toBe(panel);
        expect(clone.properties).not.toBe(panel.properties);
        expect(clone.layout).not.toBe(panel.layout);

        expect(clone.properties.equals(panel.properties)).toBe(true);
        expect(clone.layout.size).toBe(panel.layout.size);

    });

    it("serializes to JSON", () => {

        const panel = new Panel(
            createProperties(),
            createLayout()
        );

        expect(panel.toJSON()).toEqual({
            properties: {
                name: "MIMO-LAB",
                size: {
                    width: 600,
                    height: 240
                },
                background: "#111111",
                cornerRadius: 8
            },
            layout: [
                {
                    componentId: "K001",
                    bounds: {
                        position: {
                            x: 40,
                            y: 50
                        },
                        size: {
                            width: 32,
                            height: 32
                        }
                    },
                    rotation: {
                        degrees: 0
                    }
                }
            ]
        });

    });

    it("deserializes from JSON", () => {

        const panel = Panel.fromJSON({
            properties: {
                name: "LAB-16",
                size: {
                    width: 720,
                    height: 280
                },
                background: "#181818",
                cornerRadius: 10
            },
            layout: [
                {
                    componentId: "F001",
                    bounds: {
                        position: {
                            x: 20,
                            y: 30
                        },
                        size: {
                            width: 24,
                            height: 100
                        }
                    },
                    rotation: {
                        degrees: 90
                    }
                }
            ]
        });

        expect(panel.properties.name).toBe("LAB-16");
        expect(panel.properties.size.width).toBe(720);
        expect(panel.layout.size).toBe(1);

        const item = panel.layout.item("F001");

        expect(item.bounds.x).toBe(20);
        expect(item.bounds.height).toBe(100);
        expect(item.rotation.degrees).toBe(90);

    });

});