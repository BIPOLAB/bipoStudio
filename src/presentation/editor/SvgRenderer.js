import SvgFactory from "./SvgFactory.js";

import Panel from "../../domain/panel/Panel.js";

export default class SvgRenderer {

  render(panel) {

    if (!(panel instanceof Panel)) {

        throw new TypeError(

            "SvgRenderer.render() expects a Panel instance."

        );

    }

    const properties = panel.properties;

    const svg = SvgFactory.createSvg(

        properties.size.width,

        properties.size.height

    );

    svg.classList.add("panel");

    const background = SvgFactory.createRectangle(

        0,

        0,

        properties.size.width,

        properties.size.height,

        properties.cornerRadius

    );

    background.classList.add("panel-background");

    background.setAttribute(

        "fill",

        properties.background

    );

    svg.appendChild(background);

    for (const item of panel.layout) {

        svg.appendChild(

            this.renderItem(item)

        );

    }

    return svg;

}
renderItem(item) {

    switch (item.type) {

        case "pot":
            return this.renderPot(item);

        case "switch":
            return this.renderSwitch(item);

        default:
            return this.renderPlaceholder(item);

    }

}

renderPlaceholder(item) {

    const bounds = item.bounds;

    const rect = SvgFactory.createRectangle(
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height,
        2
    );

    rect.classList.add("layout-item");

    rect.setAttribute(
        "fill",
        "#808080"
    );

    rect.setAttribute(
        "stroke",
        "#404040"
    );

    rect.setAttribute(
        "stroke-width",
        1
    );

    return rect;

}

renderPot(item) {

    const bounds = item.bounds;

    const group = SvgFactory.createGroup("pot");

    const body = SvgFactory.createCircle(

        bounds.x + bounds.width / 2,

        bounds.y + bounds.height / 2,

        bounds.width / 2

    );

    body.setAttribute(
        "fill",
        "#2E2E2E"
    );

    body.setAttribute(
        "stroke",
        "#111111"
    );

    body.setAttribute(
        "stroke-width",
        1
    );

    group.appendChild(body);

    const indicator = SvgFactory.createLine(

        bounds.x + bounds.width / 2,

        bounds.y + bounds.height / 2,

        bounds.x + bounds.width / 2,

        bounds.y + 4

    );

    indicator.setAttribute(
        "stroke",
        "#D9D7CF"
    );

    indicator.setAttribute(
        "stroke-width",
        2
    );

    group.appendChild(indicator);

    return group;

}

renderSwitch(item) {

    const bounds = item.bounds;

    const button = SvgFactory.createRectangle(

        bounds.x,

        bounds.y,

        bounds.width,

        bounds.height,

        3

    );

    button.setAttribute(
        "fill",
        "#4A4A4A"
    );

    button.setAttribute(
        "stroke",
        "#202020"
    );

    button.setAttribute(
        "stroke-width",
        1
    );

    return button;

}

}