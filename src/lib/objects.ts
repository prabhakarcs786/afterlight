import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { type Artifact } from "./domain";

const material = (color: string, metalness = 0, roughness = 0.48) => new THREE.MeshStandardMaterial({ color, metalness, roughness });

function mesh(group: THREE.Group, geometry: THREE.BufferGeometry, surface: THREE.Material, position: [number, number, number] = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, surface);
  object.position.set(...position); object.castShadow = true; object.receiveShadow = true; group.add(object);
  return object;
}

function box(group: THREE.Group, dimensions: [number, number, number], surface: THREE.Material, position: [number, number, number], radius = 0.06) {
  return mesh(group, new RoundedBoxGeometry(...dimensions, 3, radius), surface, position);
}

function faceText(lines: string[], background: string, foreground: string): THREE.Material {
  if (typeof document === "undefined") return material(background);
  const canvas = document.createElement("canvas"); canvas.width = 768; canvas.height = 384;
  const context = canvas.getContext("2d")!;
  context.fillStyle = background; context.fillRect(0, 0, 768, 384);
  context.fillStyle = foreground; context.textAlign = "left";
  lines.forEach((line, index) => { context.font = `${index === 0 ? "bold 60px" : "32px"} monospace`; context.fillText(line, 48, 90 + index * 75); });
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: .7 });
}

export function createObject(kind: Artifact["kind"]): THREE.Group {
  const group = new THREE.Group();
  const charcoal = material("#263330");
  const silver = material("#bcc8cb", .72, .25);
  const ivory = material("#f5f2dc");

  if (kind === "cassette") {
    box(group, [3.5, 2.2, .42], charcoal, [0, 0, 0], .12);
    box(group, [3.1, 1.36, .04], ivory, [0, .2, .23], .05);
    box(group, [3.06, .24, .045], material("#d8543c"), [0, .54, .26], .015);
    box(group, [2.3, .42, .06], material("#161f1d"), [0, -.08, .27], .06);
    for (const horizontal of [-.78, .78]) {
      const reel = mesh(group, new THREE.CylinderGeometry(.39, .39, .08, 40), silver, [horizontal, -.08, .3]); reel.rotation.x = Math.PI / 2;
      const hole = mesh(group, new THREE.CylinderGeometry(.19, .19, .1, 12), charcoal, [horizontal, -.08, .35]); hole.rotation.x = Math.PI / 2;
      for (let tooth = 0; tooth < 6; tooth++) {
        const angle = tooth * Math.PI / 3;
        const spoke = box(group, [.09, .18, .025], ivory, [horizontal + Math.cos(angle) * .21, -.08 + Math.sin(angle) * .21, .412], .01); spoke.rotation.z = angle - Math.PI / 2;
      }
    }
    box(group, [2.15, .34, .45], charcoal, [0, -.91, .015], .05);
    mesh(group, new THREE.PlaneGeometry(2.9, .5), faceText(["SIDE A", "AFTERLIGHT / 001"], "#f5f2dc", "#263330"), [0, .87, .258]);
    for (const horizontal of [-1.55, 1.55]) for (const vertical of [-.87, .87]) {
      const screw = mesh(group, new THREE.CylinderGeometry(.055, .055, .03, 12), silver, [horizontal, vertical, .23]); screw.rotation.x = Math.PI / 2;
    }
  } else if (kind === "key") {
    const brass = material("#cfab54", .72, .28);
    mesh(group, new THREE.TorusGeometry(.53, .16, 16, 48), brass, [-1.05, .1, 0]);
    box(group, [2.5, .27, .19], brass, [.66, .1, 0], .04);
    for (const [horizontal, height] of [[.55, .4], [1.02, .57], [1.52, .38]]) box(group, [.22, height, .19], brass, [horizontal, -.12 - height / 2, 0], .025);
    group.rotation.z = -.36;
  } else if (kind === "disk") {
    box(group, [2.65, 2.7, .23], material("#304c4a"), [0, 0, 0], .09);
    box(group, [1.53, 1, .035], silver, [-.18, .82, .145], .02);
    box(group, [.36, .73, .04], charcoal, [.14, .86, .17], .01);
    box(group, [2.11, 1.06, .028], ivory, [0, -.6, .145], .04);
    mesh(group, new THREE.PlaneGeometry(2.02, .94), faceText(["1.44 MB", "DO NOT FORGET", "ARCHIVE 003"], "#f5f2dc", "#263330"), [0, -.58, .164]);
    box(group, [.17, .14, .03], charcoal, [-1.1, -1.1, .15], .01);
  } else if (kind === "bulb") {
    const glass = new THREE.MeshPhysicalMaterial({ color: "#d9e9dd", transparent: true, opacity: .35, roughness: .12, metalness: .1, side: THREE.DoubleSide, depthWrite: false });
    mesh(group, new THREE.SphereGeometry(.92, 48, 32), glass, [0, .5, 0]);
    mesh(group, new THREE.CylinderGeometry(.48, .35, .55, 32), glass, [0, -.48, 0]);
    mesh(group, new THREE.CylinderGeometry(.37, .37, .65, 32), silver, [0, -1.01, 0]);
    for (let thread = 0; thread < 5; thread++) {
      const ring = mesh(group, new THREE.TorusGeometry(.37, .035, 8, 40), silver, [0, -.79 - thread * .12, 0]); ring.rotation.x = Math.PI / 2;
    }
    mesh(group, new THREE.CylinderGeometry(.24, .17, .15, 24), charcoal, [0, -1.4, 0]);
    const filamentPoints = Array.from({ length: 90 }, (_, index) => new THREE.Vector3(-.31 + index / 89 * .62, .27 + Math.sin(index * .6) * .12, Math.cos(index * .6) * .08));
    mesh(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(filamentPoints), 100, .015, 6, false), material("#d07528", .35));
    for (const horizontal of [-.32, .32]) box(group, [.022, .95, .022], silver, [horizontal, -.2, 0], .005);
  } else if (kind === "phone") {
    box(group, [1.62, 3.04, .2], silver, [0, 0, 0], .15);
    box(group, [1.51, 2.94, .06], charcoal, [0, 0, .12], .12);
    box(group, [1.36, 2.28, .022], material("#d5e9df"), [0, .05, .157], .02);
    mesh(group, new THREE.PlaneGeometry(1.29, .65), faceText(["12:41", "NO SIGNAL", "AFTERLIGHT"], "#d5e9df", "#263330"), [0, .66, .171]);
    const home = mesh(group, new THREE.CylinderGeometry(.13, .13, .02, 30), silver, [0, -1.27, .159]); home.rotation.x = Math.PI / 2;
    box(group, [.34, .035, .025], silver, [0, 1.32, .16], .013);
  } else if (kind === "cup") {
    const ceramic = material("#d8785e", .05, .3);
    const profile = [new THREE.Vector2(.05, -.95), new THREE.Vector2(.69, -.95), new THREE.Vector2(.83, -.81), new THREE.Vector2(.85, .88), new THREE.Vector2(.77, .92), new THREE.Vector2(.73, .82), new THREE.Vector2(.69, -.72), new THREE.Vector2(.05, -.74)];
    mesh(group, new THREE.LatheGeometry(profile, 64), ceramic);
    mesh(group, new THREE.TorusGeometry(.55, .13, 16, 48), ceramic, [1.04, .08, 0]);
    mesh(group, new THREE.CylinderGeometry(.68, .68, .02, 48), material("#513b2d"), [0, -.71, 0]);
  } else if (kind === "disc") {
    mesh(group, new THREE.RingGeometry(.3, 1.4, 96), new THREE.MeshPhysicalMaterial({ color: "#b5e4e1", metalness: .8, roughness: .22, side: THREE.DoubleSide, iridescence: 1 }));
    mesh(group, new THREE.RingGeometry(.18, .39, 48), new THREE.MeshStandardMaterial({ color: "#e7eded", transparent: true, opacity: .65, side: THREE.DoubleSide }), [0, 0, .012]);
    for (const [radius, color] of [[1.24, "#b2c9e9"], [1.3, "#d4b5d3"], [1.35, "#cce4ba"]] as const) mesh(group, new THREE.TorusGeometry(radius, .017, 8, 96), material(color, .65), [0, 0, .02]);
    group.rotation.x = -.22;
  } else {
    mesh(group, new THREE.CylinderGeometry(.55, .55, 2.2, 48), material("#e5bc53", .3));
    mesh(group, new THREE.CylinderGeometry(.56, .56, .56, 48), charcoal, [0, .88, 0]);
    mesh(group, new THREE.CylinderGeometry(.55, .55, .07, 48), silver, [0, -1.14, 0]);
    mesh(group, new THREE.CylinderGeometry(.26, .26, .15, 32), silver, [0, 1.22, 0]);
    mesh(group, new THREE.PlaneGeometry(.74, .69), faceText(["1.5 V", "STORED", "DAYLIGHT"], "#e5bc53", "#263330"), [0, -.12, .559]);
    group.rotation.z = -.2;
  }
  return group;
}

export function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const surfaces = Array.isArray(child.material) ? child.material : [child.material];
      for (const surface of surfaces) {
        if (surface instanceof THREE.MeshStandardMaterial) surface.map?.dispose();
        surface.dispose();
      }
    }
  });
}