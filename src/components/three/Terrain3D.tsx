"use client";

import dynamic from "next/dynamic";

const RegimeTerrain = dynamic(() => import("./RegimeTerrain"), {
  ssr: false,
  loading: () => null,
});

export function Terrain3D({ intensity, color }: { intensity?: number; color?: string }) {
  return <RegimeTerrain intensity={intensity} color={color} />;
}

export default Terrain3D;
