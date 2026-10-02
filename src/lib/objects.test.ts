import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { objectKinds } from "./domain";
import { createObject, disposeObject } from "./objects";

describe("original object reconstructions", () => {
  it.each(objectKinds)("creates a finite, bounded %s model", (kind) => {
    const object = createObject(kind);
    object.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    expect(object.children.length).toBeGreaterThan(0);
    expect(size.toArray().every((dimension) => Number.isFinite(dimension) && dimension > 0 && dimension < 5)).toBe(true);
    disposeObject(object);
  });
});