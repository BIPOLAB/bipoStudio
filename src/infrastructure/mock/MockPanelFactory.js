import Panel from "../../domain/panel/Panel.js";
import PanelProperties from "../../domain/panel/PanelProperties.js";

import PanelLayout from "../../domain/layout/PanelLayout.js";
import LayoutItem from "../../domain/layout/LayoutItem.js";

import Bounds from "../../domain/layout/geometry/Bounds.js";
import Position from "../../domain/layout/geometry/Position.js";
import Size from "../../domain/layout/geometry/Size.js";
import Rotation from "../../domain/layout/geometry/Rotation.js";

export default class MockPanelFactory {

    static create() {

        const properties = new PanelProperties(
            "LAB-16",
            new Size(720, 180)
        );

        const layout = new PanelLayout();

        //--------------------------------------------------
        // 8 Potenciómetros
        //--------------------------------------------------

        const startX = 70;
        const spacing = 80;

        for (let i = 0; i < 8; i++) {

            layout.add(

                new LayoutItem(

                    `P${i + 1}`,

                    "pot",

                    new Bounds(

                        new Position(
                            startX + spacing * i,
                            55
                        ),

                        new Size(32, 32)

                    ),

                    new Rotation()

                )

            );

        }

        //--------------------------------------------------
        // 8 Switches
        //--------------------------------------------------

        for (let i = 0; i < 8; i++) {

            layout.add(

                new LayoutItem(

                    `S${i + 1}`,

                    "switch",

                    new Bounds(

                        new Position(
                            startX + spacing * i,
                            135
                        ),

                        new Size(20, 20)

                    ),

                    new Rotation()

                )

            );

        }

        return new Panel(
            properties,
            layout
        );

    }

}