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

type MapMode = "globe" | "flat";

const REGION_PRESETS: { label: string; region: "Global" | RegionKey; rotate: [number, number]; center: [number, number]; zoom: number }[] = [
  { label: "Global", region: "Global", rotate: [-22, -20], center: [12, 18], zoom: 1.0 },
  { label: "Middle East", region: "Middle East", rotate: [-46, -26], center: [46, 26], zoom: 2.35 },
  { label: "Europe", region: "Europe", rotate: [-18, -50], center: [18, 50], zoom: 2.4 },
  { label: "Indo-Pacific", region: "Indo-Pacific", rotate: [-112, -20], center: [112, 20], zoom: 2.0 },
  { label: "Americas", region: "Americas", rotate: [82, -22], center: [-82, 22], zoom: 1.75 },
  { label: "Africa", region: "Africa", rotate: [-20, -4], center: [20, 4], zoom: 1.9 },
];

const MARITIME_CORRIDORS: GeoJSON.Feature<GeoJSON.LineString>[] = [
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [32.3, 30.6], // Suez
        [43.3, 12.6], // Bab el-Mandeb
        [56.2, 26.5], // Hormuz
        [72.8, 18.9], // Arabian Sea
        [101.2, 2.5], // Malacca
        [119.5, 24.0], // Taiwan Strait
      ],
    },
  },
  {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: [
        [-5.6, 36.0], // Gibraltar
        [15.0, 35.5], // Central Med
        [32.3, 30.6], // Suez
      ],
    },
  },
];

function severityColor(severity: number): string {
  if (severity >= 75) return "#f43f5e";
  if (severity >= 55) return "#f59e0b";
  return "#22d3ee";
}

export function WorldMap({ events, selectedEventId, onSelectEvent, lang }: WorldMapProps) {
  const [mode, setMode] = useState<MapMode>("globe");
  const [rotation, setRotation] = useState<[number, number]>([-28, -22]);
  const [flatCenter, setFlatCenter] = useState<[number, number]>([12, 18]);
  const [zoom, setZoom] = useState<number>(1.0);
  const [autoSpin, setAutoSpin] = useState<boolean>(true);
  const [hoveredEvent, setHoveredEvent] = useState<GeoEvent | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredChoke, setHoveredChoke] = useState<string | null>(null);

  const dragRef = useRef<{ active: boolean; x: number; y: number } | null>(null);

  // Extract real Natural-Earth 110m country polygons from TopoJSON once
  const countries = useMemo<CountryFeature[]>(() => {
    const topo = countriesAtlas as unknown as Topology<{ countries: GeometryCollection<{ name?: string }> }>;
    const fc = feature(topo, topo.objects.countries) as unknown as { features: CountryFeature[] };
    return fc.features;
  }, []);

  const graticule = useMemo(() => geoGraticule10(), []);

  // Gentle 3D globe rotation until user interacts
  useEffect(() => {
    if (mode !== "globe" || !autoSpin) return;
    const id = setInterval(() => {
      setRotation(([lon, lat]) => [((lon - 0.28 + 540) % 360) - 180, lat]);
    }, 50);
    return () => clearInterval(id);
  }, [mode, autoSpin]);

  const width = 960;
  const height = 490;

  const projection = useMemo(() => {
    if (mode === "globe") {
      return geoOrthographic()
        .scale(215 * zoom)
        .translate([width / 2, height / 2])
        .rotate([rotation[0], rotation[1], 0])
        .clipAngle(90);
    }
    return geoNaturalEarth1()
      .scale(178 * zoom)
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
      setRotation(([lon, lat]) => [lon + dx * 0.42, Math.max(-68, Math.min(68, lat - dy * 0.38))]);
    } else {
      setFlatCenter(([lon, lat]) => [
        Math.max(-160, Math.min(160, lon - (dx * 0.35) / zoom)),
        Math.max(-60, Math.min(72, lat + (dy * 0.35) / zoom)),
      ]);
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-[#060c18] shadow-[0_0_70px_rgba(6,182,212,0.08)]">
      {/* Top Interactive Map Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/85 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg border border-slate-800 bg-slate-900/90 p-0.5 font-mono text-[11px]">
            <button
              onClick={() => {
                setMode("globe");
                setZoom(1.0);
              }}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
                mode === "globe" ? "bg-cyan-500/20 font-bold text-cyan-300" : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="h-3.5 w-3.5" /> 3D Globe
            </button>
            <button
              onClick={() => {
                setMode("flat");
                setZoom(1.0);
                setFlatCenter([12, 18]);
              }}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition ${
                mode === "flat" ? "bg-cyan-500/20 font-bold text-cyan-300" : "text-slate-400 hover:text-white"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" /> {lang === "de" ? "Weltkarte" : "Tactical Map"}
            </button>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {REGION_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => focusPreset(p)}
                className="rounded-md border border-slate-800/80 bg-slate-900/60 px-2 py-1 font-mono text-[10px] text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-300"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.35).toFixed(2))))}
            className="rounded-md border border-slate-800 bg-slate-900/90 p-1.5 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.85, Number((z - 0.35).toFixed(2))))}
            className="rounded-md border border-slate-800 bg-slate-900/90 p-1.5 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1.0);
              setRotation([-28, -22]);
              setFlatCenter([12, 18]);
              setAutoSpin(mode === "globe");
            }}
            className="rounded-md border border-slate-800 bg-slate-900/90 p-1.5 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300"
            title="Reset View"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Real Natural-Earth d3-geo Interactive SVG Canvas */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[360px] w-full cursor-grab select-none active:cursor-grabbing sm:h-[440px] lg:h-[485px]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="img"
        aria-label="Interactive Geopolitical World Map"
      >
        <defs>
          <radialGradient id="spaceBg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#091529" />
            <stop offset="100%" stopColor="#04070e" />
          </radialGradient>
          <radialGradient id="globeSphere" cx="38%" cy="34%" r="68%">
            <stop offset="0%" stopColor="#0e223d" />
            <stop offset="70%" stopColor="#071122" />
            <stop offset="100%" stopColor="#030711" />
          </radialGradient>
          <filter id="beaconGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={width} height={height} fill="url(#spaceBg)" />

        {/* Globe atmospheric sphere halo */}
        {mode === "globe" && (
          <path
            d={pathGen({ type: "Sphere" }) || ""}
            fill="url(#globeSphere)"
            stroke="rgba(34, 211, 238, 0.35)"
            strokeWidth="1.5"
          />
        )}

        {/* Geodesic Graticule */}
        <path
          d={pathGen(graticule) || ""}
          fill="none"
          stroke="rgba(56, 189, 248, 0.08)"
          strokeWidth="0.7"
        />

        {/* Real 110m Country Polygons */}
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
                fill={isHov ? "#173154" : "#0e1d34"}
                stroke={isHov ? "rgba(56, 189, 248, 0.7)" : "rgba(56, 189, 248, 0.24)"}
                strokeWidth={isHov ? 1.1 : 0.65}
                onMouseEnter={() => setHoveredCountry(cName || null)}
                onMouseLeave={() => setHoveredCountry(null)}
              />
            );
          })}
        </g>

        {/* Maritime Geodesic Trade Corridors */}
        {MARITIME_CORRIDORS.map((corridor, idx) => {
          const d = pathGen(corridor);
          if (!d) return null;
          return (
            <path
              key={idx}
              d={d}
              fill="none"
              stroke="rgba(16, 185, 129, 0.42)"
              strokeWidth="1.4"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Maritime Chokepoint Diamonds */}
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
                x={-4.2}
                y={-4.2}
                width={8.4}
                height={8.4}
                transform="rotate(45)"
                fill={cp.baseRisk === "HIGH" ? "rgba(244,63,94,0.35)" : "rgba(16,185,129,0.32)"}
                stroke={cp.baseRisk === "HIGH" ? "#fb7185" : "#34d399"}
                strokeWidth="1.2"
              />
              {active && (
                <g transform="translate(10, -18)">
                  <rect x={0} y={0} width={178} height={36} rx={6} fill="#020617" fillOpacity={0.95} stroke="rgba(52,211,153,0.5)" />
                  <text x={8} y={14} fill="#6ee7b7" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                    {cp.name}
                  </text>
                  <text x={8} y={27} fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                    {cp.flowLabel} · {cp.baseRisk}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Live Geopolitical Event Hotspots */}
        {events.map((ev) => {
          if (!isVisibleOnGlobe(ev.lng, ev.lat)) return null;
          const pt = projection([ev.lng, ev.lat]);
          if (!pt) return null;
          const color = severityColor(ev.severity);
          const isSelected = ev.id === selectedEventId;
          const r = ev.severity >= 75 ? 6.0 : ev.severity >= 55 ? 4.8 : 4.0;

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
              {ev.severity >= 55 && (
                <circle r={r + 4} fill="none" stroke={color} strokeWidth="1.4" className="radar-pulse" />
              )}
              {isSelected && (
                <circle r={r + 7} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 2" />
              )}
              <circle r={r} fill={color} fillOpacity={0.92} stroke="#020617" strokeWidth="1.4" filter="url(#beaconGlow)" />
            </g>
          );
        })}
      </svg>

      {/* Bottom Telemetry & Hover Bar */}
      <div className="flex min-h-[46px] flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 bg-slate-950/90 px-4 py-2 text-xs">
        {hoveredEvent ? (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
              style={{
                backgroundColor: `${severityColor(hoveredEvent.severity)}22`,
                color: severityColor(hoveredEvent.severity),
                border: `1px solid ${severityColor(hoveredEvent.severity)}55`,
              }}
            >
              SEV {hoveredEvent.severity}/100
            </span>
            <span className="font-mono text-[11px] font-semibold text-cyan-300">{hoveredEvent.countryOrZone}</span>
            <span className="line-clamp-1 max-w-lg text-slate-200">{hoveredEvent.headline}</span>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between text-slate-400">
            <span className="font-mono text-[11px]">
              {hoveredCountry
                ? `${lang === "de" ? "Territorium" : "Territory"}: ${hoveredCountry}`
                : mode === "globe"
                ? lang === "de"
                  ? "3D-Globus ziehen zum Drehen · Klicke auf einen Hotspot für das KI-Dossier."
                  : "Drag 3D Globe to rotate · Click any hotspot beacon for AI Dossier."
                : lang === "de"
                ? "Ziehen zum Verschieben · Zoom & Regionen-Buttons oben nutzbar."
                : "Drag to pan · Use Zoom & Region focus buttons above."}
            </span>
            <span className="hidden font-mono text-[10px] text-slate-500 sm:inline">
              Natural Earth 110m · {events.length} {lang === "de" ? "Hotspots" : "beacons"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
