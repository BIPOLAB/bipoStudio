/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : ScreenHost.js
 * Version : 0.1.0
 * Feature : 001 - Boot Experience
 *
 * Copyright (c) bipoLab engineering
 * --------------------------------------------------------------------
 */

export default class ScreenHost {

    constructor(element) {

        if (!(element instanceof HTMLElement)) {

            throw new TypeError(
                "ScreenHost requires a valid HTML element."
            );

        }

        this.element = element;
        this.currentScreen = null;

    }

    show(screen) {

        if (
            !screen ||
            typeof screen.mount !== "function" ||
            typeof screen.unmount !== "function"
        ) {

            throw new TypeError(
                "ScreenHost can only show objects implementing mount() and unmount()."
            );

        }

        if (this.currentScreen === screen) {

            return;

        }

        this.clear();

        this.currentScreen = screen;
        this.currentScreen.mount();

    }

    clear() {

        if (this.currentScreen) {

            this.currentScreen.unmount();
            this.currentScreen = null;

        }

        this.element.replaceChildren();

    }

}
