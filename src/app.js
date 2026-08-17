document.addEventListener(
    "DOMContentLoaded",
    initializeEditor
);

async function initializeEditor() {
    console.log("MIMO-LAB Editor started");

    const deviceContainer =
        document.getElementById("device-container");

    if (!deviceContainer) {
        console.error(
            'No se encontró el elemento con id="device-container"'
        );

        return;
    }

    try {
        const svg = await loadPanelSVG(
            deviceContainer,
            "./img/mimo-panel.svg"
        );

        console.log(
            "Panel SVG cargado correctamente"
        );

        createControlsLayer(svg);
        createControls(svg);
    } catch (error) {
        console.error(
            "Error cargando el panel:",
            error
        );

        deviceContainer.innerHTML = `
            <div class="device-error">
                No se pudo cargar el panel MIMO-LAB.
            </div>
        `;
    }
}