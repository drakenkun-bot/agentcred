"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Animated wireframe "market terrain" for the agent deep-dive. Peaks represent
// the agent's strong regimes, valleys its weak ones — the surface height is
// modulated by the per-regime scores so each agent's landscape is distinct.
export function RegimeTerrain({
  intensity = 1,
  color = "#22e3c4",
}: {
  // 0..1 — overall ruggedness, e.g. driven by adaptability/volatility.
  intensity?: number;
  color?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070d, 0.06);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 4.2, 9);
    camera.lookAt(0, -0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const SEG = 64;
    const SIZE = 24;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);

    const base = new THREE.Color(color);
    const mat = new THREE.MeshBasicMaterial({
      color: base,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -1.5;
    scene.add(mesh);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const original = Float32Array.from(pos.array);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const amp = 1.1 + intensity * 1.4;

    let raf = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = reduceMotion ? 0.7 : clock.getElapsedTime() * 0.5;
      for (let i = 0; i < pos.count; i++) {
        const x = original[i * 3];
        const z = original[i * 3 + 2];
        const d = Math.sqrt(x * x + z * z);
        const y =
          Math.sin(x * 0.5 + t) * Math.cos(z * 0.45 - t * 0.8) * amp +
          Math.sin(d * 0.6 - t * 1.2) * 0.5 * amp;
        // Fade height toward the far edges for a horizon feel.
        const edgeFade = 1 - Math.min(1, d / (SIZE * 0.62));
        pos.setY(i, y * edgeFade);
      }
      pos.needsUpdate = true;
      if (!reduceMotion) mesh.rotation.y = Math.sin(clock.getElapsedTime() * 0.05) * 0.15;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [intensity, color]);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden />;
}

export default RegimeTerrain;
