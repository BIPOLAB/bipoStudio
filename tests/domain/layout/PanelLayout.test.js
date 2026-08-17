import { describe, expect, it } from "vitest";

import PanelLayout from "../../../src/domain/layout/PanelLayout.js";
import LayoutItem from "../../../src/domain/layout/LayoutItem.js";
import Bounds from "../../../src/domain/geometry/Bounds.js";
import Position from "../../../src/domain/geometry/Position.js";
import Size from "../../../src/domain/geometry/Size.js";

describe("PanelLayout", () => {

    it("starts empty", () => {

        const layout = new PanelLayout();

        expect(layout.size).toBe(0);

    });

    it("adds a layout item", () => {

        const layout = new PanelLayout();

        const item = new LayoutItem(
            "K001",
            new Bounds(
                new Position(10, 20),
                new Size(40, 50)
            )
        );

        layout.add(item);

        expect(layout.size).toBe(1);

        expect(layout.has("K001")).toBe(true);

        expect(layout.item("K001")).toBe(item);

    });

    it("removes an item", () => {

        const layout = new PanelLayout();

        const item = new LayoutItem(
            "K001",
            new Bounds(
                new Position(),
                new Size(10, 10)
            )
        );

        layout.add(item);

        layout.remove("K001");

        expect(layout.size).toBe(0);

        expect(layout.has("K001")).toBe(false);

    });
        it("is iterable", () => {

        const layout = new PanelLayout();

        layout.add(
            new LayoutItem(
                "K001",
                new Bounds(
                    new Position(),
                    new Size(10, 10)
                )
            )
        );

        layout.add(
            new LayoutItem(
                "K002",
                new Bounds(
                    new Position(),
                    new Size(20, 20)
                )
            )
        );

        const ids = [];

        for (const item of layout) {
            ids.push(item.componentId);
        }

        expect(ids).toEqual([
            "K001",
            "K002"
        ]);

    });

});