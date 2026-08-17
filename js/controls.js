const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

function createControlsLayer(svg) {
    let controlsLayer = svg.querySelector("#controls-layer");

    if (controlsLayer) {
        return controlsLayer;
    }

    controlsLayer = document.createElementNS(
        SVG_NAMESPACE,
        "g"
    );

    controlsLayer.setAttribute("id", "controls-layer");

    svg.appendChild(controlsLayer);

    return controlsLayer;
}

function createControls(svg) {
    if (
        typeof DEVICE_LAYOUT === "undefined" ||
        !Array.isArray(DEVICE_LAYOUT)
    ) {
        console.error(
            "DEVICE_LAYOUT no existe o no es una lista válida"
        );

        return;
    }

    DEVICE_LAYOUT.forEach((control) => {
        switch (control.type) {
            case "knob":
                createKnob(svg, control);
                break;

            default:
                console.warn(
                    `Tipo de control desconocido: ${control.type}`
                );
        }
    });
}

function createKnob(svg, control) {
    const controlsLayer =
        svg.querySelector("#controls-layer");

    if (!controlsLayer) {
        console.error(
            "No se encontró la capa controls-layer"
        );

        return;
    }

    const knob = document.createElementNS(
        SVG_NAMESPACE,
        "g"
    );

    knob.setAttribute("id", control.id);
    knob.setAttribute("class", "device-control knob");

    knob.setAttribute(
        "transform",
        `translate(${control.x} ${control.y})`
    );

    const knobBody = document.createElementNS(
        SVG_NAMESPACE,
        "circle"
    );

    knobBody.setAttribute("cx", "0");
    knobBody.setAttribute("cy", "0");
    knobBody.setAttribute("r", control.radius);
    knobBody.setAttribute("class", "knob-body");

    const knobIndicator = document.createElementNS(
        SVG_NAMESPACE,
        "line"
    );

    knobIndicator.setAttribute("x1", "0");
    knobIndicator.setAttribute("y1", "0");
    knobIndicator.setAttribute("x2", "0");

    knobIndicator.setAttribute(
        "y2",
        String(-control.radius * 0.65)
    );

    knobIndicator.setAttribute(
        "class",
        "knob-indicator"
    );

    knob.appendChild(knobBody);
    knob.appendChild(knobIndicator);

    controlsLayer.appendChild(knob);

  knob.addEventListener("click", () => {
    setSelectedControl(control, knob);
});
}