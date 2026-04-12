"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";

export function MapBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const el = ref.current;
    if (!token || !el) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: el,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: [-96.85, 32.85],
      zoom: 8.4,
      pitch: 38,
      bearing: -18,
      interactive: false,
      attributionControl: false,
    });
    const id = window.setInterval(() => {
      map.setBearing(map.getBearing() + 0.03);
    }, 60);
    return () => {
      clearInterval(id);
      map.remove();
    };
  }, []);

  return <div ref={ref} className="absolute inset-0 h-full w-full" />;
}
