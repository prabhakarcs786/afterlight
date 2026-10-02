"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Maximize, Pause, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { createObject, disposeObject } from "@/lib/objects";
import { type Artifact } from "@/lib/domain";

export function ObjectScene({ kind, controls = true, renderMode = false }: { kind: Artifact["kind"]; controls?: boolean; renderMode?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const orbit = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [failed, setFailed] = useState(false);
  const spin = useRef(false);

  useEffect(() => { spin.current = spinning; }, [spinning]);
  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); }
    catch { queueMicrotask(() => setFailed(true)); return; }
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3.2, 3.2, 2.5, -2.5, .1, 100);
    camera.position.set(renderMode ? 2.2 : 3.2, renderMode ? 1.7 : 2.1, 7); camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
    renderer.domElement.setAttribute("aria-label", `Interactive three-dimensional reconstruction of a ${kind}`);
    renderer.domElement.setAttribute("role", "img");
    host.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x73877a, 2.8));
    const key = new THREE.DirectionalLight(0xfffaf0, 4.5); key.position.set(-3, 6, 7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias = .025; scene.add(key);
    const fill = new THREE.DirectionalLight(0xd8f6ff, 2); fill.position.set(5, 1, -3); scene.add(fill);
    const object = createObject(kind); scene.add(object);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .13 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -1.65; floor.receiveShadow = true; scene.add(floor);
    const interaction = new OrbitControls(camera, renderer.domElement); interaction.enableDamping = true; interaction.enablePan = false; interaction.enableZoom = false; interaction.autoRotateSpeed = 1.8; interaction.minPolarAngle = .35; interaction.maxPolarAngle = Math.PI * .85; interaction.enabled = controls;
    orbit.current = interaction;
    const resize = () => {
      const width = host.clientWidth; const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      const halfHeight = renderMode ? 2.05 : 2.45;
      camera.left = -halfHeight * width / height; camera.right = halfHeight * width / height; camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => { interaction.autoRotate = spin.current; interaction.update(Math.min(clock.getDelta(), .1)); renderer.render(scene, camera); });
    const contextLost = (event: Event) => { event.preventDefault(); renderer.setAnimationLoop(null); setFailed(true); };
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    return () => {
      observer.disconnect(); interaction.dispose(); renderer.setAnimationLoop(null); renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      disposeObject(object); floor.geometry.dispose(); floor.material.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); orbit.current = null; cameraRef.current = null;
    };
  }, [kind, controls, renderMode]);

  function zoom(amount: number) {
    const camera = cameraRef.current;
    if (camera) { camera.zoom = Math.max(.75, Math.min(1.7, camera.zoom + amount)); camera.updateProjectionMatrix(); }
  }

  return <div className={`object-scene ${renderMode ? "render-scene" : ""} ${failed ? "scene-failed" : ""}`}>
    <div className="scene-canvas" ref={container} />
    {failed && <p className="scene-fallback" role="status">3D view unavailable. The object image and catalogue remain available.</p>}
    {controls && !failed && <div className="scene-controls" aria-label="Object view controls"><button type="button" title={spinning ? "Pause rotation" : "Rotate object"} aria-label={spinning ? "Pause rotation" : "Rotate object"} aria-pressed={spinning} onClick={() => setSpinning(!spinning)}>{spinning ? <Pause size={17} /> : <RotateCw size={17} />}</button><span /><button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => zoom(.15)}><ZoomIn size={17} /></button><button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => zoom(-.15)}><ZoomOut size={17} /></button><button type="button" title="Reset view" aria-label="Reset view" onClick={() => { orbit.current?.reset(); if (cameraRef.current) { cameraRef.current.zoom = 1; cameraRef.current.updateProjectionMatrix(); } setSpinning(false); }}><Maximize size={16} /></button></div>}
  </div>;
}