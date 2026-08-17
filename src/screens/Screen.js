/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : Screen.js
 * Version : 0.1.0
 * Sprint  : 04
 * Feature : 001 - Boot Experience
 *
 * Base class for every application screen.
 *
 * Copyright (c) bipoLab engineering
 * --------------------------------------------------------------------
 */

export default class Screen {

    constructor(element, eventBus) {

        this.element = element;
        this.eventBus = eventBus;

    }

    mount() {

    }

    unmount() {

    }

    render() {

    }

    clear() {

        this.element.innerHTML = "";

    }

}