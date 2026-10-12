'use client';

import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Part } from './model';

/** An interactive 3D view of the parts (drag to rotate, scroll to zoom) */
export function ModelPreview({ parts }: { parts: Part[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    element.append(renderer.domElement);

    const scene = new Scene();
    scene.add(new AmbientLight(0xff_ff_ff, 1.5));
    const light = new DirectionalLight(0xff_ff_ff, 2);
    light.position.set(1, -1, 2);
    scene.add(light);

    const model = new Group();
    const materials = parts.map(
      ({ color }) => new MeshStandardMaterial({ color, roughness: 0.7, metalness: 0 }),
    );
    for (const [index, part] of parts.entries())
      model.add(new Mesh(part.geometry, materials[index]));
    scene.add(model);

    // Center the model and look at it from slightly below, like at a print on the bed
    const box = new Box3().setFromObject(model);
    model.position.sub(box.getCenter(new Vector3()));
    const radius = box.getBoundingSphere(new Sphere()).radius || 1;
    const direction = new Vector3(0, -0.6, 1).normalize();

    const camera = new PerspectiveCamera(35, 1, radius / 100, radius * 20);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // Fit the model's bounding sphere into the narrower field of view
      const verticalFov = MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2);
      camera.position.copy(direction).multiplyScalar(distance);
      controls.update();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null); // eslint-disable-line unicorn/no-null
      observer.disconnect();
      controls.dispose();
      for (const material of materials) material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [parts]);

  return (
    <div
      ref={container}
      className="bg-muted/50 aspect-square w-full cursor-grab overflow-hidden rounded-3xl active:cursor-grabbing"
    />
  );
}
