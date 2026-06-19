"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { scoreColor } from "@/lib/format";

export interface ConstellationNode {
  id: string;
  name: string;
  trust: number;
}

// A floating constellation of AI agents: glowing crystalline nodes (sized &
// colored by trust score) linked into a slowly-rotating network. Pure three.js
// so it stays light and avoids react-three-fiber version coupling.
export function ConstellationMap({ nodes }: { nodes: ConstellationNode[] }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Distribute nodes on a jittered sphere (Fibonacci) so the network reads
    // as a 3D constellation rather than a flat ring.
    const count = Math.max(nodes.length, 6);
    const radius = 8;
    const positions: THREE.Vector3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const jitter = 0.85 + ((i * 13) % 7) / 20;
      positions.push(
        new THREE.Vector3(
          Math.cos(theta) * r * radius * jitter,
          y * radius * 0.7,
          Math.sin(theta) * r * radius * jitter,
        ),
      );
    }

    // Node meshes (icosahedrons with a soft glow halo).
    const nodeMeshes: THREE.Mesh[] = [];
    nodes.forEach((n, i) => {
      const color = new THREE.Color(scoreColor(n.trust));
      const size = 0.32 + (n.trust / 100) * 0.5;

      const geo = new THREE.IcosahedronGeometry(size, 0);
      const mat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(positions[i]);
      group.add(mesh);
      nodeMeshes.push(mesh);

      // Glow core
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(size * 0.55, 12, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }),
      );
      core.position.copy(positions[i]);
      group.add(core);

      // Halo sprite
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending }),
      );
      halo.scale.setScalar(size * 4);
      halo.position.copy(positions[i]);
      group.add(halo);
    });

    // Connect each node to its nearest neighbours.
    const linePositions: number[] = [];
    const lineColors: number[] = [];
    for (let i = 0; i < positions.length; i++) {
      const dists = positions
        .map((p, j) => ({ j, d: positions[i].distanceTo(p) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);
      const ci = new THREE.Color(scoreColor(nodes[i]?.trust ?? 60));
      for (const { j } of dists) {
        linePositions.push(positions[i].x, positions[i].y, positions[i].z);
        linePositions.push(positions[j].x, positions[j].y, positions[j].z);
        lineColors.push(ci.r, ci.g, ci.b, ci.r, ci.g, ci.b);
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending }),
    );
    group.add(lines);

    // Faint starfield backdrop.
    const starGeo = new THREE.BufferGeometry();
    const starCount = 320;
    const stars: number[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40 - 10);
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(stars, 3));
    const starField = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0x4a6c7a, size: 0.06, transparent: true, opacity: 0.5 }),
    );
    scene.add(starField);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const clock = new THREE.Clock();
    let mouseX = 0;
    let mouseY = 0;

    const onMove = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    mount.addEventListener("pointermove", onMove);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (!reduceMotion) {
        group.rotation.y = t * 0.08 + mouseX * 0.4;
        group.rotation.x = Math.sin(t * 0.15) * 0.08 + mouseY * 0.25;
        starField.rotation.y = t * 0.01;
        nodeMeshes.forEach((m, i) => {
          m.rotation.x = t * 0.4 + i;
          m.rotation.y = t * 0.3 + i;
        });
      }
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
      mount.removeEventListener("pointermove", onMove);
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
          const m = obj.material as THREE.Material | THREE.Material[];
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [nodes]);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden />;
}

export default ConstellationMap;
