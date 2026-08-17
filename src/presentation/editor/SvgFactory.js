const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export default class SvgFactory {

    static createElement(tagName, attributes = {}) {

        const element = document.createElementNS(
            SVG_NAMESPACE,
            tagName
        );

        for (const [name, value] of Object.entries(attributes)) {

            if (value !== undefined && value !== null) {
                element.setAttribute(name, value);
            }

        }

        return element;

    }

    static createSvg(width, height) {

        return this.createElement("svg", {
            xmlns: SVG_NAMESPACE,
            width,
            height,
            viewBox: `0 0 ${width} ${height}`,
            version: "1.1"
        });

    }

    static createGroup(className = "") {

        const group = this.createElement("g");

        if (className.length > 0) {
            group.classList.add(className);
        }

        return group;

    }

    static createRectangle(x, y, width, height, radius = 0) {

        return this.createElement("rect", {
            x,
            y,
            width,
            height,
            rx: radius,
            ry: radius
        });

    }

    static createCircle(cx, cy, radius) {

        return this.createElement("circle", {
            cx,
            cy,
            r: radius
        });

    }

    static createLine(x1, y1, x2, y2) {

        return this.createElement("line", {
            x1,
            y1,
            x2,
            y2
        });

    }

}