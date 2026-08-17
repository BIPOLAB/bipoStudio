function updatePropertiesPanel(control) {

    const panel = document.querySelector(".properties-panel");

    if (!panel) return;

    panel.innerHTML = `
        <h2>Properties</h2>

        <table class="properties-table">

            <tr>
                <td>ID</td>
                <td>${control.id}</td>
            </tr>

            <tr>
                <td>Type</td>
                <td>${control.type}</td>
            </tr>

            <tr>
                <td>X</td>
                <td>${control.x}</td>
            </tr>

            <tr>
                <td>Y</td>
                <td>${control.y}</td>
            </tr>

        </table>
    `;
}