async function loadPanelSVG(container, svgPath) {
    const response = await fetch(svgPath);

    if (!response.ok) {
        throw new Error(
            `No se pudo cargar el SVG. HTTP ${response.status}`
        );
    }

    const svgContent = await response.text();

    container.innerHTML = svgContent;

    const svg = container.querySelector("svg");

    if (!svg) {
        throw new Error(
            "El archivo cargado no contiene una etiqueta SVG"
        );
    }

    svg.removeAttribute("width");
    svg.removeAttribute("height");

    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute(
        "preserveAspectRatio",
        "xMidYMid meet"
    );

    return svg;
}