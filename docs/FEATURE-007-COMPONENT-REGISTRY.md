# Feature-007 — Component Registry

## Goal

Centralize component storage, lookup, grouping, and duplicate-ID validation behind a domain API.

## Public API

```js
hardware.component("K001");
hardware.hasComponent("K001");
hardware.components();
hardware.componentsOfType(ComponentType.KNOB);
hardware.componentCount();
```

`getComponent`, `getComponents`, and `getComponentsByType` remain temporarily available as compatibility aliases while older UI modules are migrated.

## Design decision

`Hardware` remains immutable. Therefore its registry is populated only during construction and exposes read-only queries. Editing a hardware definition will later produce a new definition rather than mutating the connected device model.
