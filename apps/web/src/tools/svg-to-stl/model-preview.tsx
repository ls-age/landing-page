'use client';

import { cn } from '@workspace/ui/lib/utils';
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
  className,
}: {
  parts: Part[];
  highlights: Highlight[];
  /** A CSS color; by default a radial gradient from dark gray (center) to lighter gray */
  background?: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const view = useRef<View>(undefined);

  useEffect(() => {
    const element = container.current;
    if (!element) return;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    // Fills the element without taking part in its layout: a canvas with its old size would keep
    // the element from shrinking (and so from ever being resized)
    renderer.domElement.className = 'absolute inset-0 size-full';
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
    // In the one column layout the page scrolls past the preview: there, the wheel only zooms with
    // Ctrl or Cmd (pinching on a trackpad sets Ctrl), like on embedded maps
    const twoColumns = globalThis.matchMedia('(min-width: 48rem)');
    const onWheel = (event: WheelEvent) => {
      if (!twoColumns.matches && !event.ctrlKey && !event.metaKey) event.stopImmediatePropagation();
    };
    // Before the controls' own listener
    renderer.domElement.addEventListener('wheel', onWheel, { capture: true });

    // Look at the model from slightly below and to the side, like at a print on the bed
    const direction = new Vector3(-0.2, -0.4, 1).normalize();
    // The intro swings in from further to the side, which shows right away that it's 3D
    const introDirection = new Vector3(-1, -0.6, 0.5).normalize();
    const introDuration = 1400;
    /** When the intro started: `undefined` before the first frame, `false` once it's over */
    let introStart: number | false | undefined = globalThis.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
      ? false
      : undefined;
    // Dragging or zooming takes over
    controls.addEventListener('start', () => {
      introStart = false;
    });

    let fittedRadius = 0;
    let distance = 0;
    const place = (from: Vector3) => {
      camera.position.copy(from).multiplyScalar(distance);
      controls.update();
    };
    const fit = (radius: number) => {
      fittedRadius = radius;
      camera.near = radius / 100;
      camera.far = radius * 20;
      camera.updateProjectionMatrix();
      // Fit the model's bounding sphere into the narrower field of view
      const verticalFov = MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      // With a little padding around it
      distance = (radius * 1.1) / Math.sin(Math.min(verticalFov, horizontalFov) / 2);
      controls.target.set(0, 0, 0);
      if (introStart === false) place(direction);
    };
    const intro = (time: number) => {
      if (introStart === false || fittedRadius === 0) return;
      introStart ??= time;
      const progress = Math.min((time - introStart) / introDuration, 1);
      // Eases out (cubic)
      const eased = 1 - (1 - progress) ** 3;
      place(introDirection.clone().lerp(direction, eased).normalize());
      if (progress === 1) introStart = false;
    };
    view.current = {
      model,
      fit: (radius) => {
        if (Math.abs(radius - fittedRadius) > fittedRadius * 0.05) fit(radius);
      },
    };

    // Hidden while the tool's dialog is closed (it keeps its state)
    let visible = false;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      visible = width > 0 && height > 0;
      if (!visible) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (fittedRadius > 0) fit(fittedRadius);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    renderer.setAnimationLoop((time) => {
      if (!visible) return;
      intro(time);
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      view.current = undefined;
      renderer.setAnimationLoop(null); // eslint-disable-line unicorn/no-null
      observer.disconnect();
      renderer.domElement.removeEventListener('wheel', onWheel, { capture: true });
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
      className={cn(
        'bg-radial to-muted dark:to-muted relative aspect-square w-full cursor-grab overflow-hidden rounded-3xl from-neutral-300 active:cursor-grabbing dark:from-neutral-900',
        className,
      )}
      style={{ background }}
    />
  );
}
