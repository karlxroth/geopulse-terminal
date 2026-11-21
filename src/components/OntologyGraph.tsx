"use client";

import React, { useMemo, useState } from "react";
import type { OntologyEdge, OntologyGraph, OntologyNode, OntologyNodeKind } from "@/lib/types";

interface OntologyGraphViewProps {
  graph: OntologyGraph;
  selectedNodeId: string | null;
  onSelectNode: (node: OntologyNode) => void;
  lang: "de" | "en";
}

interface PositionedNode {
  node: OntologyNode;
  x: number;
  y: number;
}

function edgeColor(rel: OntologyEdge["relation"]): string {
  switch (rel) {
    case "IMPACTS_BULLISH":
      return "#10b981";
    case "IMPACTS_BEARISH":
      return "#ef4444";
    case "IMPACTS_VOLATILE":
      return "#d97706";
    case "LOCATED_AT":
      return "#38bdf8";
    case "EXPOSED_TO":
      return "#475569";
    case "INVOLVES":
    default:
      return "#60a5fa";
  }
}

function kindMeta(kind: OntologyNodeKind): { stroke: string; fill: string; badge: string } {
  switch (kind) {
    case "ENTITY":
      return { stroke: "#60a5fa", fill: "#111a2a", badge: "ENT" };
    case "EVENT":
      return { stroke: "#dc2626", fill: "#1b1216", badge: "EVT" };
    case "CHOKEPOINT":
      return { stroke: "#d97706", fill: "#1b1710", badge: "CHK" };
    case "ASSET":
      return { stroke: "#10b981", fill: "#0e1b18", badge: "AST" };
  }
}

export function OntologyGraphView({ graph, selectedNodeId, onSelectNode, lang }: OntologyGraphViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<"ALL" | OntologyNodeKind>("ALL");

  // Clean architectural 4-column Ontology layout:
  // Col 1: ENTITIES (Actors/States) -> Col 2: EVENTS -> Col 3: CHOKEPOINTS -> Col 4: MARKET ASSETS
  const { positioned, visibleEdges, width, height } = useMemo(() => {
    const W = 1040;
    const H = 560;

    const topEntities = graph.nodes
      .filter((n) => n.kind === "ENTITY")
      .sort((a, b) => b.degree - a.degree || b.severity - a.severity)
      .slice(0, 11);

    const topEvents = graph.nodes
      .filter((n) => n.kind === "EVENT")
      .sort((a, b) => b.severity - a.severity || b.degree - a.degree)
      .slice(0, 11);

    const topChokepoints = graph.nodes
      .filter((n) => n.kind === "CHOKEPOINT")
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 7);

    const topAssets = graph.nodes
      .filter((n) => n.kind === "ASSET")
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 10);

    const layoutColumn = (list: OntologyNode[], x: number): PositionedNode[] => {
      const padTop = 58;
      const padBot = 36;
      const usable = H - padTop - padBot;
      const step = list.length > 1 ? usable / (list.length - 1) : 0;
      return list.map((node, i) => ({
        node,
        x,
        y: list.length === 1 ? H / 2 : padTop + i * step,
      }));
    };

    const allPos: PositionedNode[] = [
      ...layoutColumn(topEntities, 130),
      ...layoutColumn(topEvents, 410),
      ...layoutColumn(topChokepoints, 690),
      ...layoutColumn(topAssets, 920),
    ];

    const posMap = new Map(allPos.map((p) => [p.node.id, p]));
    const edges = graph.edges.filter((e) => {
      if (!posMap.has(e.sourceId) || !posMap.has(e.targetId)) return false;
      // Avoid cluttering direct Entity->Asset edges unless an Entity/Asset is actively focused
      if (e.relation === "EXPOSED_TO" && !selectedNodeId && !hoveredId) return false;
      return true;
    });

    return { positioned: allPos, visibleEdges: edges, width: W, height: H };
  }, [graph, selectedNodeId, hoveredId]);

  const posById = useMemo(() => new Map(positioned.map((p) => [p.node.id, p])), [positioned]);

  const activeFocusId = hoveredId || selectedNodeId;
  const connectedIds = useMemo(() => {
    if (!activeFocusId) return null;
    const set = new Set<string>([activeFocusId]);
    for (const e of visibleEdges) {
      if (e.sourceId === activeFocusId) set.add(e.targetId);
      if (e.targetId === activeFocusId) set.add(e.sourceId);
    }
    return set;
  }, [activeFocusId, visibleEdges]);

  return (
    <div className="flex h-full flex-col bg-[#0a0c10]">
      {/* Ontology Canvas Sub-Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2633] bg-[#0e1218] px-3 py-1.5 font-mono text-[10px]">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="font-semibold tracking-wider text-slate-200 uppercase">
            {lang === "de" ? "OBJEKT-ONTOLOGIE · KAUSALGRAPH" : "OBJECT ONTOLOGY · CAUSAL GRAPH"}
          </span>
          <span>
            {positioned.length} {lang === "de" ? "Knoten" : "Nodes"} / {visibleEdges.length} {lang === "de" ? "Relationen" : "Links"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {(["ALL", "ENTITY", "EVENT", "CHOKEPOINT", "ASSET"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilterKind(k)}
              className={`rounded-sm border px-2 py-0.5 transition ${
                filterKind === k
                  ? "border-slate-500 bg-slate-800 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Crisp Architectural SVG Graph */}
      <div className="relative flex-1 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full min-h-[470px] w-full select-none bg-[#0a0c10]">
          {/* Subtle architectural dot grid */}
          <defs>
            <pattern id="gothamGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.7" fill="#1b2330" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#gothamGrid)" />

          {/* Column Headers */}
          {[
            { x: 130, label: "01 // ENTITIES & ACTORS" },
            { x: 410, label: "02 // VERIFIED EVENTS" },
            { x: 690, label: "03 // CHOKEPOINTS" },
            { x: 920, label: "04 // EXPOSED ASSETS" },
          ].map((col) => (
            <g key={col.label}>
              <line x1={col.x} y1={28} x2={col.x} y2={height - 16} stroke="#161d27" strokeWidth="1" strokeDasharray="2 4" />
              <text
                x={col.x}
                y={20}
                textAnchor="middle"
                fill="#64748b"
                fontSize="9.5"
                fontFamily="monospace"
                letterSpacing="1.2"
              >
                {col.label}
              </text>
            </g>
          ))}

          {/* Directed Bezier Relationship Links */}
          <g>
            {visibleEdges.map((edge) => {
              const src = posById.get(edge.sourceId);
              const tgt = posById.get(edge.targetId);
              if (!src || !tgt) return null;

              const isFocused =
                !activeFocusId || edge.sourceId === activeFocusId || edge.targetId === activeFocusId;
              const midX = (src.x + tgt.x) / 2;
              const d = `M ${src.x},${src.y} C ${midX},${src.y} ${midX},${tgt.y} ${tgt.x},${tgt.y}`;

              return (
                <path
                  key={edge.id}
                  d={d}
                  fill="none"
                  stroke={edgeColor(edge.relation)}
                  strokeWidth={activeFocusId && isFocused ? 1.8 : 0.9}
                  strokeOpacity={activeFocusId ? (isFocused ? 0.92 : 0.06) : 0.28}
                  strokeDasharray={edge.relation === "EXPOSED_TO" ? "3 3" : undefined}
                />
              );
            })}
          </g>

          {/* Typed Ontology Object Nodes */}
          <g>
            {positioned.map(({ node, x, y }) => {
              const meta = kindMeta(node.kind);
              const isSelected = node.id === selectedNodeId;
              const isDimmed =
                (connectedIds !== null && !connectedIds.has(node.id)) ||
                (filterKind !== "ALL" && node.kind !== filterKind);
              const boxW = node.kind === "ASSET" ? 132 : node.kind === "CHOKEPOINT" ? 156 : 178;
              const boxH = 30;
              const sevStroke =
                node.kind === "EVENT"
                  ? node.severity >= 75
                    ? "#dc2626"
                    : node.severity >= 55
                    ? "#d97706"
                    : "#3b82f6"
                  : meta.stroke;

              return (
                <g
                  key={node.id}
                  transform={`translate(${x - boxW / 2}, ${y - boxH / 2})`}
                  opacity={isDimmed ? 0.16 : 1}
                  className="cursor-pointer transition-opacity duration-150"
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onSelectNode(node)}
                >
                  <rect
                    width={boxW}
                    height={boxH}
                    rx={2}
                    fill={isSelected ? "#1a2436" : meta.fill}
                    stroke={isSelected ? "#e2e8f0" : sevStroke}
                    strokeWidth={isSelected ? 1.6 : 0.9}
                  />
                  {/* Left type bar */}
                  <rect width={3.5} height={boxH} rx={1} fill={sevStroke} />

                  <text x={10} y={12.5} fill="#f1f5f9" fontSize="9.5" fontFamily="monospace" fontWeight="700">
                    {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
                  </text>
                  <text x={10} y={24} fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    {node.kind === "EVENT"
                      ? `SEV ${node.severity} · ${node.metadata.sources ?? 1} SRC`
                      : node.sublabel.length > 22
                      ? `${node.sublabel.slice(0, 21)}…`
                      : node.sublabel}
                  </text>

                  {/* Degree badge */}
                  <text x={boxW - 8} y={18} textAnchor="end" fill="#64748b" fontSize="8.5" fontFamily="monospace">
                    {node.degree}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1e2633] bg-[#0e1218] px-3 py-1.5 font-mono text-[10px] text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#60a5fa]" /> INVOLVES (Entity)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#38bdf8]" /> LOCATED_AT (Chokepoint)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#10b981]" /> BULLISH IMPACT
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#ef4444]" /> BEARISH IMPACT
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#d97706]" /> VOLATILE
          </span>
        </div>
        <span>{lang === "de" ? "Knoten anklicken für Objekt-Inspektor & Kausal-Pfad" : "Select node to isolate causal subgraph"}</span>
      </div>
    </div>
  );
}
