"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { geoDistance, geoGraticule10, geoNaturalEarth1, geoOrthographic, geoPath, type GeoPermissibleObjects } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import countriesAtlas from "world-atlas/countries-110m.json";
import { Globe, Map as MapIcon, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { MARITIME_CHOKEPOINTS } from "@/lib/geoData";
import type { GeoEvent, RegionKey } from "@/lib/types";

interface WorldMapProps {
  events: GeoEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: GeoEvent) => void;
  lang: "de" | "en";
}

interface CountryFeature {
  type: "Feature";
  id?: string | number;
  properties: { name?: string };
  geometry: GeoJSON.Geometry;
}

type MapMode = "flat" | "globe";

const REGION_PRESETS: { label: string; region: "Global" | RegionKey; rotate: [number, number]; center: [number, number]; zoom: number }[] = [
  { label: "GLOBAL", region: "Global", rotate: [-22, -20], center: [14, 18], zoom: 1.0 },
  { label: "MENA", region: "Middle East", rotate: [-46, -26], center: [46, 26], zoom: 2.5 },
  { label: "EUR", region: "Europe", rotate: [-18, -50], center: [18, 50], zoom: 2.5 },
  { label: "INDOPAC", region: "Indo-Pacific", rotate: [-112, -20], center: [112, 20], zoom: 2.1 },
  { label: "AMER", region: "Americas", rotate: [82, -22], center: [-82, 22], zoom: 1.8 },
  { label: "AFR", region: "Africa", rotate: [-20, -4], center: [20, 4], zoom: 1.9 },
];

const MARITIME_CORRIDORS: GeoJSON.Feature<GeoJSON.LineString>[] = [
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [32.3, 30.6],
        [43.3, 12.6],
        [56.2, 26.5],
        [72.8, 18.9],
        [101.2, 2.5],
        [119.5, 24.0],
      ],
    },
  },
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-5.6, 36.0],
        [15.0, 35.5],
        [32.3, 30.6],
      ],
    },
  },
];

function severityColor(severity: number): string {
  if (severity >= 75) return "#dc2626";
  if (severity >= 55) return "#d97706";
  return "#60a5fa";
}

export function WorldMap({ events, selectedEventId, onSelectEvent, lang }: WorldMapProps) {
  const [mode, setMode] = useState<MapMode>("flat");
  const [rotation, setRotation] = useState<[number, number]>([-26, -24]);
  const [flatCenter, setFlatCenter] = useState<[number, number]>([14, 18]);
  const [zoom, setZoom] = useState<number>(1.0);
  const [autoSpin, setAutoSpin] = useState<boolean>(false);
  const [hoveredEvent, setHoveredEvent] = useState<GeoEvent | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredChoke, setHoveredChoke] = useState<string | null>(null);

  const dragRef = useRef<{ active: boolean; x: number; y: number } | null>(null);

  const countries = useMemo<CountryFeature[]>(() => {
    const topo = countriesAtlas as unknown as Topology<{ countries: GeometryCollection<{ name?: string }> }>;
    const fc = feature(topo, topo.objects.countries) as unknown as { features: CountryFeature[] };
    return fc.features;
  }, []);

  const graticule = useMemo(() => geoGraticule10(), []);

  useEffect(() => {
    if (mode !== "globe" || !autoSpin) return;
    const id = setInterval(() => {
      setRotation(([lon, lat]) => [((lon - 0.22 + 540) % 360) - 180, lat]);
    }, 50);
    return () => clearInterval(id);
  }, [mode, autoSpin]);

  const width = 1040;
  const height = 540;

  const projection = useMemo(() => {
    if (mode === "globe") {
      return geoOrthographic()
        .scale(235 * zoom)
        .translate([width / 2, height / 2])
        .rotate([rotation[0], rotation[1], 0])
        .clipAngle(90);
    }
    return geoNaturalEarth1()
      .scale(192 * zoom)
      .translate([width / 2, height / 2 + 12])
      .center(flatCenter);
  }, [mode, rotation, flatCenter, zoom]);

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const isVisibleOnGlobe = (lng: number, lat: number): boolean => {
    if (mode !== "globe") return true;
    const centerGeo: [number, number] = [-rotation[0], -rotation[1]];
    return geoDistance([lng, lat], centerGeo) < Math.PI / 2 - 0.04;
  };

  const focusPreset = (preset: (typeof REGION_PRESETS)[number]) => {
    setAutoSpin(false);
    setRotation(preset.rotate);
    setFlatCenter(preset.center);
    setZoom(mode === "globe" ? Math.min(1.65, Math.max(1.0, preset.zoom * 0.72)) : preset.zoom);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };
    setAutoSpin(false);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current?.active) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { active: true, x: e.clientX, y: e.clientY };

    if (mode === "globe") {
      setRotation(([lon, lat]) => [lon + dx * 0.4, Math.max(-68, Math.min(68, lat - dy * 0.36))]);
    } else {
      setFlatCenter(([lon, lat]) => [
        Math.max(-160, Math.min(160, lon - (dx * 0.32) / zoom)),
        Math.max(-60, Math.min(72, lat + (dy * 0.32) / zoom)),
      ]);
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="flex h-full flex-col bg-[#0a0c10]">
      {/* Geospatial Sub-Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2633] bg-[#0e1218] px-3 py-1.5 font-mono text-[10px]">
        <div className="flex items-center gap-2">
          <div className="flex border border-[#232d3d] bg-[#0a0c10]">
            <button
              onClick={() => {
                setMode("flat");
                setZoom(1.0);
                setFlatCenter([14, 18]);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 transition ${
                mode === "flat" ? "bg-[#1c2533] font-semibold text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <MapIcon className="h-3 w-3" /> FLAT-PROJ
            </button>
            <button
              onClick={() => {
                setMode("globe");
                setZoom(1.0);
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 transition ${
                mode === "globe" ? "bg-[#1c2533] font-semibold text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Globe className="h-3 w-3" /> ORTHO-3D
            </button>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {REGION_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => focusPreset(p)}
                className="border border-transparent px-1.5 py-0.5 text-slate-400 transition hover:border-[#2a3649] hover:bg-[#141b25] hover:text-slate-100"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.35).toFixed(2))))}
            className="border border-[#232d3d] bg-[#10151d] p-1 text-slate-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="h-3 w-3" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.35).toFixed(2))))}
            className="border border-[#232d3d] bg-[#10151d] p-1 text-slate-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              setZoom(1.0);
              setRotation([-26, -24]);
              setFlatCenter([14, 18]);
            }}
            className="border border-[#232d3d] bg-[#10151d] p-1 text-slate-400 hover:text-white"
            title="Reset"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Precision Vector Map */}
      <div className="relative flex-1 overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full min-h-[470px] w-full cursor-grab select-none active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <rect width={width} height={height} fill="#0a0c10" />

          {mode === "globe" && (
            <path
              d={pathGen({ type: "Sphere" }) || ""}
              fill="#0d1118"
              stroke="#2a3649"
              strokeWidth="1"
            />
          )}

          <path d={pathGen(graticule) || ""} fill="none" stroke="#151c26" strokeWidth="0.7" />

          <g>
            {countries.map((c, idx) => {
              const d = pathGen(c as unknown as GeoPermissibleObjects);
              if (!d) return null;
              const cName = c.properties?.name ?? "";
              const isHov = hoveredCountry === cName && cName !== "";
              return (
                <path
                  key={c.id ?? idx}
                  d={d}
                  fill={isHov ? "#1d2736" : "#121821"}
                  stroke={isHov ? "#60a5fa" : "#222c3c"}
                  strokeWidth={isHov ? 0.9 : 0.55}
                  onMouseEnter={() => setHoveredCountry(cName || null)}
                  onMouseLeave={() => setHoveredCountry(null)}
                />
              );
            })}
          </g>

          {/* Maritime Corridors */}
          {MARITIME_CORRIDORS.map((corridor, idx) => {
            const d = pathGen(corridor);
            if (!d) return null;
            return (
              <path
                key={idx}
                d={d}
                fill="none"
                stroke="#334155"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Chokepoint Diamonds */}
          {MARITIME_CHOKEPOINTS.map((cp) => {
            if (!isVisibleOnGlobe(cp.lng, cp.lat)) return null;
            const pt = projection([cp.lng, cp.lat]);
            if (!pt) return null;
            const active = hoveredChoke === cp.id;
            return (
              <g
                key={cp.id}
                transform={`translate(${pt[0]}, ${pt[1]})`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredChoke(cp.id)}
                onMouseLeave={() => setHoveredChoke(null)}
              >
                <rect
                  x={-3.8}
                  y={-3.8}
                  width={7.6}
                  height={7.6}
                  transform="rotate(45)"
                  fill="#0a0c10"
                  stroke={cp.baseRisk === "HIGH" ? "#d97706" : "#64748b"}
                  strokeWidth="1.3"
                />
                {active && (
                  <g transform="translate(10, -16)">
                    <rect x={0} y={0} width={174} height={32} fill="#0e1218" stroke="#334155" />
                    <text x={7} y={13} fill="#e2e8f0" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      {cp.name.toUpperCase()}
                    </text>
                    <text x={7} y={25} fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                      {cp.flowLabel} · {cp.baseRisk}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Verified Event Markers */}
          {events.map((ev) => {
            if (!isVisibleOnGlobe(ev.lng, ev.lat)) return null;
            const pt = projection([ev.lng, ev.lat]);
            if (!pt) return null;
            const color = severityColor(ev.severity);
            const isSelected = ev.id === selectedEventId;
            const r = ev.severity >= 75 ? 5.2 : ev.severity >= 55 ? 4.3 : 3.5;

            return (
              <g
                key={ev.id}
                transform={`translate(${pt[0]}, ${pt[1]})`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectEvent(ev);
                }}
                onMouseEnter={() => setHoveredEvent(ev)}
                onMouseLeave={() => setHoveredEvent(null)}
              >
                {isSelected && (
                  <>
                    <line x1={-12} y1={0} x2={12} y2={0} stroke="#e2e8f0" strokeWidth="0.8" />
                    <line x1={0} y1={-12} x2={0} y2={12} stroke="#e2e8f0" strokeWidth="0.8" />
                    <rect x={-8} y={-8} width={16} height={16} fill="none" stroke="#e2e8f0" strokeWidth="1" />
                  </>
                )}
                <circle r={r} fill={color} stroke="#0a0c10" strokeWidth="1.2" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Precision Telemetry Footer */}
      <div className="flex min-h-[34px] items-center justify-between border-t border-[#1e2633] bg-[#0e1218] px-3 py-1 font-mono text-[10px]">
        {hoveredEvent ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="font-bold text-slate-200">{hoveredEvent.code}</span>
            <span style={{ color: severityColor(hoveredEvent.severity) }}>SEV {hoveredEvent.severity}</span>
            <span className="text-slate-400">
              {hoveredEvent.lat.toFixed(1)}°, {hoveredEvent.lng.toFixed(1)}°
            </span>
            <span className="truncate text-slate-200">{hoveredEvent.headline}</span>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between text-slate-500">
            <span>
              {hoveredCountry
                ? `TERRITORY // ${hoveredCountry.toUpperCase()}`
                : lang === "de"
                ? "NATURAL EARTH 110M · ZIEHEN ZUM NAVIGIEREN · MARKER FÜR OBJEKT-INSPEKTOR"
                : "NATURAL EARTH 110M · DRAG TO NAVIGATE · SELECT MARKER FOR OBJECT INSPECTOR"}
            </span>
            <span>{events.length} PLOTTED SIGNALS</span>
          </div>
        )}
      </div>
    </div>
  );
}
