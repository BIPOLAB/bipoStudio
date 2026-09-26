# FEATURE-008 — LAB-16D analog drum trigger module

## Purpose

LAB-16D is a fixed 16-input analog trigger controller for electronic drums. It is intended to accept analog sensor signals from commercial-style pads (Roland/Alesis class) or custom pads.

The physical input circuitry and firmware are outside the scope of bipoStudio. The studio represents the device through the bipoCore mock so configuration and UX can be developed before hardware integration.

## Fixed hardware model

- 16 analog trigger inputs
- 4 × 4 rack representation
- One independently configurable RGB LED per input
- Component IDs `T001` … `T016`
- Development labels use common drum roles such as Kick, Snare, Hi-Hat, Toms, Crash and Ride
- Each input remains a fixed hardware component; the workspace is not editable

## Configuration

Each trigger exposes:

- MIDI channel
- MIDI note
- velocity ceiling
- acquisition resolution: 7 / 10 / 12 / 14-bit, constrained by device capabilities
- response curve: Linear / Soft / Hard / Logarithmic / Exponential
- threshold: 0–100
- sensitivity: 0–100
- minimum velocity
- retrigger time: 0–500 ms
- scan time: 1–50 ms
- cross-talk: 0–100
- input polarity
- control name
- RGB LED configuration

The mock reports these options through device capabilities so the Inspector does not need to assume every future trigger device supports the same resolution or curve set.

## Runtime model

The mock exposes the resulting trigger activity as a MIDI velocity-like 0–127 runtime value. This deliberately keeps the UI/runtime contract independent from the eventual ADC resolution and signal-processing implementation in firmware.

## Future firmware boundary

The future device protocol should report:

- number of trigger inputs
- sensor/input type
- supported ADC resolutions
- supported response curves
- trigger calibration capabilities
- per-input runtime/diagnostic values

bipoStudio should consume those capabilities rather than hard-code physical assumptions.
