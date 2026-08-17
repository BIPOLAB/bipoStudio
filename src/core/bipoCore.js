/**
 * --------------------------------------------------------------------
 * Project : bipoStudio
 * File    : bipoCore.js
 * Version : 0.4.0
 * Sprint  : 04
 *
 * Copyright (c) bipoLab engineering
 * --------------------------------------------------------------------
 */

class BipoCore {

    constructor() {

        this.listeners = new Map();

        /**
         * Simula el comportamiento de un dispositivo real.
         * Cuando el firmware exista simplemente
         * cambiaremos este valor.
         */
        this.simulateLatency = true;

    }

    async hello() {

        await this.delay(250);

        return {
            id: "mimo-lab",
            name: "MIMO-LAB",
            firmware: "1.0.0",
            protocol: "1.0"
        };

    }

    async read(resource) {

        await this.delay();

        switch (resource) {

            case "/hardware":
                return this.getHardware();

            case "/configuration":
                return this.getConfiguration();

            case "/runtime":
                return this.getRuntime();

            default:
                throw new Error(
                    `Unknown resource: ${resource}`
                );

        }

    }

    async write(resource, data) {

        await this.delay(150);

        console.log(
            "WRITE",
            resource,
            data
        );

    }

    async commit() {

        await this.delay(100);

        console.log("COMMIT");

    }

    on(event, callback) {

        if (!this.listeners.has(event)) {

            this.listeners.set(event, []);

        }

        this.listeners
            .get(event)
            .push(callback);

    }

    emit(event, payload) {

        const callbacks =
            this.listeners.get(event);

        if (!callbacks) {

            return;

        }

        callbacks.forEach(callback => {

            callback(payload);

        });

    }

    async delay(time = null) {

        if (!this.simulateLatency) {

            return;

        }

        const milliseconds =
            time ??
            (300 + Math.floor(Math.random() * 500));

        return new Promise(resolve => {

            setTimeout(resolve, milliseconds);

        });

    }

    getHardware() {

        return {
            id: "mimo-lab",
            name: "MIMO-LAB",
            vendor: "bipoLab engineering",
            hardwareRevision: "A1",
            components: [
                {
                    id: "K001",
                    label: "Knob 1",
                    type: "knob",
                    position: { x: 120, y: 90 }
                },
                {
                    id: "F001",
                    label: "Fader 1",
                    type: "fader",
                    position: { x: 260, y: 90 }
                },
                {
                    id: "S001",
                    label: "Switch 1",
                    type: "switch",
                    position: { x: 400, y: 90 }
                }
            ],
            connectors: []
        };

    }

    getConfiguration() {

        return {

            K001: {

                messageType: "cc",
                channel: 1,
                number: 20

            },

            F001: {

                messageType: "cc",
                channel: 1,
                number: 21

            },

            S001: {

                messageType: "note",
                channel: 1,
                number: 60

            }

        };

    }

    getRuntime() {

        return {

            K001: 0,
            F001: 0,
            S001: 0

        };

    }

}

const bipoCore = new BipoCore();

export default bipoCore;