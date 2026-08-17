let selectedControl = null;

function getSelectedControl() {
    return selectedControl;
}

function setSelectedControl(controlData, controlElement) {

    // Deseleccionar el anterior
    if (selectedControl) {
        selectedControl.element.classList.remove("selected");
    }

    selectedControl = {
        data: controlData,
        element: controlElement
    };

    controlElement.classList.add("selected");

    console.log("Control seleccionado:", controlData.id);

    updatePropertiesPanel(controlData);
}