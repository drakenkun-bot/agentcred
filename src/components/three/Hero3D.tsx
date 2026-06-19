"use client";

import dynamic from "next/dynamic";
import type { ConstellationNode } from "./ConstellationMap";

const ConstellationMap = dynamic(() => import("./ConstellationMap"), {
  ssr: false,
  loading: () => null,
});

export function Hero3D({ nodes }: { nodes: ConstellationNode[] }) {
  return <ConstellationMap nodes={nodes} />;
}

export default Hero3D;
