import React from "react";
import { GeoPulseTerminal } from "@/components/GeoPulseTerminal";
import { getIntelligenceSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const initialSnapshot = await getIntelligenceSnapshot(false);
  return <GeoPulseTerminal initialSnapshot={initialSnapshot} />;
}
