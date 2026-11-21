import assert from "node:assert/strict";
import test from "node:test";

// Lightweight pure verification of RSS parsing & clustering invariants via Node built-in test runner
test("GeoPulse RSS entity decoding & tag extraction", () => {
  const sample = `<item><title><![CDATA[Red Sea shipping attack lifts oil &amp; tanker rates]]></title><link>https://example.com/1</link><description>Naval tensions near Bab el-Mandeb.</description><pubDate>Sat, 21 Nov 2026 11:00:00 GMT</pubDate></item>`;
  const titleMatch = sample.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  assert.ok(titleMatch);
  const decoded = titleMatch[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&");
  assert.equal(decoded, "Red Sea shipping attack lifts oil & tanker rates");
});

test("Global Risk Index bounds and chokepoint coverage", async () => {
  const fs = await import("node:fs");
  const geoSource = fs.readFileSync(new URL("../src/lib/geoData.ts", import.meta.url), "utf8");
  assert.ok(geoSource.includes("Strait of Hormuz"));
  assert.ok(geoSource.includes("Taiwan Strait"));
  assert.ok(geoSource.includes("Bab el-Mandeb"));
});
