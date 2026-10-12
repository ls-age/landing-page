'use client';

import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  ShapeGeometry,
  Sphere,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Area } from './geometry';
import { type Part, toShapes } from './model';

/** An area (in mm) to mark on the model's surface at height `z` */
export interface Highlight {
  shape: Area;
  z: number;
}

const highlightColor = '#ff00ff';

interface View {
  model: Group;
  /** Points the camera at the model, if its size changed */
  fit: (radius: number) => void;
}

/** An interactive 3D view of the parts (drag to rotate, scroll to zoom) */
export function ModelPreview({
  parts,
  highlights,
  background,
}: {
  parts: Part[];
  highlights: Highlight[];
  /** A CSS color, the theme's muted background by default */
  background?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<View>(undefined);

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
    scene.add(model);

    const camera = new PerspectiveCamera(35, 1, 0.1, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Look at the model from slightly below, like at a print on the bed
    const direction = new Vector3(0, -0.6, 1).normalize();
    let fittedRadius = 0;
    const fit = (radius: number) => {
      fittedRadius = radius;
      camera.near = radius / 100;
      camera.far = radius * 20;
      camera.updateProjectionMatrix();
      // Fit the model's bounding sphere into the narrower field of view
      const verticalFov = MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      // With a little padding around it
      const distance = (radius * 1.1) / Math.sin(Math.min(verticalFov, horizontalFov) / 2);
      controls.target.set(0, 0, 0);
      camera.position.copy(direction).multiplyScalar(distance);
      controls.update();
    };
    view.current = {
      model,
      fit: (radius) => {
        if (Math.abs(radius - fittedRadius) > fittedRadius * 0.05) fit(radius);
      },
    };

    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (fittedRadius > 0) fit(fittedRadius);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      view.current = undefined;
      renderer.setAnimationLoop(null); // eslint-disable-line unicorn/no-null
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  useEffect(() => {
    if (!view.current) return;
    const { model, fit } = view.current;

    const materials = parts.map(
      ({ color }) => new MeshStandardMaterial({ color, roughness: 0.7, metalness: 0 }),
    );
    const highlightMaterial = new MeshBasicMaterial({ color: highlightColor });
    const highlightGeometries = highlights.map(({ shape, z }) => {
      const geometry = new ShapeGeometry(toShapes(shape));
      // Just above the surface
      geometry.translate(0, 0, z + 0.01);
      return geometry;
    });

    for (const [index, part] of parts.entries()) {
      model.add(new Mesh(part.geometry, materials[index]));
    }

    // Center the model
    model.position.set(0, 0, 0);
    const box = new Box3().setFromObject(model);
    model.position.sub(box.getCenter(new Vector3()));
    fit(box.getBoundingSphere(new Sphere()).radius || 1);

    for (const geometry of highlightGeometries) model.add(new Mesh(geometry, highlightMaterial));

    return () => {
      model.clear();
      for (const material of materials) material.dispose();
      highlightMaterial.dispose();
      for (const geometry of highlightGeometries) geometry.dispose();
    };
  }, [parts, highlights]);

  return (
    <div
      ref={container}
      className="bg-muted/50 aspect-square w-full cursor-grab overflow-hidden active:cursor-grabbing"
      style={{ backgroundColor: background }}
    />
  );
}
