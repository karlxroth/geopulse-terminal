"use client";

import React, { useState } from "react";
import { MARITIME_CHOKEPOINTS } from "@/lib/geoData";
import type { GeoEvent } from "@/lib/types";

interface WorldMapProps {
  events: GeoEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: GeoEvent) => void;
  lang: "de" | "en";
}

// Equirectangular projection onto 1000 x 500 SVG tactical canvas
function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return { x, y };
}

function severityColor(severity: number): string {
  if (severity >= 75) return "#f43f5e"; // Crimson Critical
  if (severity >= 55) return "#f59e0b"; // Amber Elevated
  return "#22d3ee"; // Cyan Watch
}

// Clean Natural-Earth inspired continental silhouettes (equirectangular 1000x500)
const CONTINENT_PATHS = [
  // North America
  "M 62,72 L 128,58 L 195,55 L 240,76 L 290,94 L 298,125 L 268,148 L 245,172 L 222,195 L 208,214 L 185,204 L 160,185 L 138,162 L 114,132 L 76,105 Z",
  // Greenland
  "M 345,35 L 402,28 L 424,58 L 395,88 L 362,84 L 348,60 Z",
  // South America
  "M 225,222 L 265,216 L 308,242 L 342,276 L 336,318 L 310,362 L 284,412 L 268,424 L 254,394 L 246,348 L 234,296 L 218,256 Z",
  // Europe
  "M 455,108 L 488,82 L 530,68 L 575,66 L 598,84 L 590,118 L 566,134 L 542,140 L 518,144 L 490,148 L 466,142 L 456,125 Z",
  // UK & Ireland
  "M 456,96 L 470,92 L 474,110 L 458,114 Z",
  // Africa
  "M 452,162 L 502,154 L 552,160 L 588,186 L 618,216 L 610,255 L 586,298 L 566,342 L 538,365 L 514,344 L 500,298 L 484,262 L 450,242 L 434,205 Z",
  // Madagascar
  "M 604,298 L 616,294 L 614,326 L 602,324 Z",
  // Middle East & Asia
  "M 578,120 L 635,88 L 712,68 L 808,68 L 882,86 L 910,112 L 876,148 L 848,176 L 826,204 L 796,216 L 772,248 L 748,225 L 722,222 L 698,242 L 672,216 L 642,202 L 614,208 L 588,188 L 568,164 L 566,138 Z",
  // Japan
  "M 868,136 L 884,126 L 892,146 L 876,162 L 866,154 Z",
  // Southeast Asia Islands (Indonesia / Philippines)
  "M 776,256 L 818,262 L 846,270 L 842,282 L 792,276 L 770,268 Z",
  "M 828,218 L 842,216 L 846,240 L 832,242 Z",
  // Australia
  "M 792,312 L 848,298 L 896,316 L 908,358 L 882,388 L 834,386 L 796,364 L 784,336 Z",
  // New Zealand
  "M 936,386 L 952,374 L 956,400 L 940,408 Z",
];

export function WorldMap({ events, selectedEventId, onSelectEvent, lang }: WorldMapProps) {
  const [hovered, setHovered] = useState<GeoEvent | null>(null);
  const [hoveredChoke, setHoveredChoke] = useState<string | null>(null);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-[#070d18] shadow-[0_0_60px_rgba(6,182,212,0.06)]">
      {/* Top tactical HUD overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 rounded-full border border-cyan-500/25 bg-slate-950/80 px-3 py-1 backdrop-blur-md">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          <span className="font-mono text-[11px] font-semibold tracking-widest text-cyan-300 uppercase">
            {lang === "de" ? "LIVE GEOPOLITIK-RADAR · ECHTZEIT-HOTSPOTS" : "LIVE GEOPOLITICAL RADAR · GLOBAL HOTSPOTS"}
          </span>
        </div>

        <div className="hidden items-center gap-3 rounded-full border border-slate-800/90 bg-slate-950/80 px-3 py-1 font-mono text-[10px] text-slate-400 backdrop-blur-md sm:flex">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> {lang === "de" ? "Kritisch (75+)" : "Critical (75+)"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> {lang === "de" ? "Erhöht (55+)" : "Elevated (55+)"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> {lang === "de" ? "Beobachtung" : "Watch"}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rotate-45 border border-emerald-400 bg-emerald-400/30" /> Chokepoint
          </span>
        </div>
      </div>

      {/* SVG Tactical World Map */}
      <svg
        viewBox="0 0 1000 470"
        className="h-[340px] w-full select-none sm:h-[420px] lg:h-[465px]"
        role="img"
        aria-label="Global Geopolitical Hotspots Map"
      >
        <defs>
          <radialGradient id="oceanGlow" cx="50%" cy="46%" r="65%">
            <stop offset="0%" stopColor="#0b1729" />
            <stop offset="100%" stopColor="#040811" />
          </radialGradient>
          <filter id="neonGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="1000" height="470" fill="url(#oceanGlow)" />

        {/* Graticule gridlines */}
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <line
            key={`v-${i}`}
            x1={i * 100}
            y1={0}
            x2={i * 100}
            y2={470}
            stroke="rgba(56, 189, 248, 0.06)"
            strokeWidth="1"
          />
        ))}
        {[1, 2, 3, 4].map((i) => (
          <line
            key={`h-${i}`}
            x1={0}
            y1={i * 94}
            x2={1000}
            y2={i * 94}
            stroke="rgba(56, 189, 248, 0.06)"
            strokeWidth="1"
            strokeDasharray={i === 2 ? "4 4" : undefined}
          />
        ))}

        {/* Strategic Maritime Trade Corridor Arcs */}
        <path
          d="M 590,192 Q 618,220 656,178 T 782,243 T 832,184"
          fill="none"
          stroke="rgba(16, 185, 129, 0.22)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
        <path
          d="M 480,145 Q 535,165 590,192"
          fill="none"
          stroke="rgba(16, 185, 129, 0.2)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />

        {/* Continents */}
        <g>
          {CONTINENT_PATHS.map((d, idx) => (
            <path
              key={idx}
              d={d}
              fill="#0e1b30"
              stroke="rgba(56, 189, 248, 0.26)"
              strokeWidth="1.15"
              className="transition-colors duration-300 hover:fill-[#132541]"
            />
          ))}
        </g>

        {/* Maritime Chokepoints */}
        {MARITIME_CHOKEPOINTS.map((cp) => {
          const { x, y } = project(cp.lat, cp.lng);
          const active = hoveredChoke === cp.id;
          return (
            <g
              key={cp.id}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredChoke(cp.id)}
              onMouseLeave={() => setHoveredChoke(null)}
            >
              <rect
                x={-4.5}
                y={-4.5}
                width={9}
                height={9}
                transform="rotate(45)"
                fill={cp.baseRisk === "HIGH" ? "rgba(244,63,94,0.35)" : "rgba(16,185,129,0.28)"}
                stroke={cp.baseRisk === "HIGH" ? "#fb7185" : "#34d399"}
                strokeWidth="1.2"
              />
              {active && (
                <g transform="translate(10, -16)">
                  <rect x={0} y={0} width={170} height={36} rx={6} fill="#020617" fillOpacity={0.94} stroke="rgba(52,211,153,0.45)" />
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
          const { x, y } = project(ev.lat, ev.lng);
          const color = severityColor(ev.severity);
          const isSelected = ev.id === selectedEventId;
          const baseRadius = ev.severity >= 75 ? 6.2 : ev.severity >= 55 ? 5.0 : 4.2;

          return (
            <g
              key={ev.id}
              transform={`translate(${x}, ${y})`}
              className="cursor-pointer"
              onClick={() => onSelectEvent(ev)}
              onMouseEnter={() => setHovered(ev)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Animated radar pulse for elevated/critical hotspots */}
              {ev.severity >= 55 && (
                <circle
                  r={baseRadius + 4}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.4"
                  className="radar-pulse"
                />
              )}

              {/* Selection ring */}
              {isSelected && (
                <circle r={baseRadius + 7} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 2" />
              )}

              <circle
                r={baseRadius}
                fill={color}
                fillOpacity={0.9}
                stroke="#020617"
                strokeWidth="1.5"
                filter="url(#neonGlow)"
              />
            </g>
          );
        })}
      </svg>

      {/* Bottom Hover Intelligence Bar */}
      <div className="flex min-h-[46px] items-center justify-between border-t border-slate-800/80 bg-slate-950/90 px-4 py-2 text-xs">
        {hovered ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-bold"
              style={{
                backgroundColor: `${severityColor(hovered.severity)}22`,
                color: severityColor(hovered.severity),
                border: `1px solid ${severityColor(hovered.severity)}55`,
              }}
            >
              SEV {hovered.severity}/100
            </span>
            <span className="font-mono text-[11px] font-semibold text-cyan-300">{hovered.countryOrZone}</span>
            <span className="line-clamp-1 max-w-xl text-slate-200">{hovered.headline}</span>
            {hovered.marketImpacts[0] && (
              <span className="rounded bg-slate-800/90 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                {hovered.marketImpacts[0].ticker} · {hovered.marketImpacts[0].direction.toUpperCase()}
              </span>
            )}
          </div>
        ) : (
          <div className="flex w-full items-center justify-between text-slate-400">
            <span className="font-mono text-[11px]">
              {lang === "de"
                ? "Klicke auf einen Hotspot für KI-Dossier, Quellen-Check & Markt-Signale."
                : "Click any hotspot beacon for AI Dossier, Source Verification & Market Signals."}
            </span>
            <span className="hidden font-mono text-[10px] text-slate-500 sm:inline">
              {events.length} {lang === "de" ? "aktive Ereignisse auf Karte" : "active beacons plotted"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
