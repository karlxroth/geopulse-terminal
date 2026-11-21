import fs from "node:fs/promises";
import path from "node:path";
import type { GeoEvent, IntelligenceSnapshot } from "./types";
import type { SubscriberRecord } from "./store";

const DATA_DIR = path.join(process.cwd(), ".geopulse-data");
const ALERT_LOG_FILE = path.join(DATA_DIR, "sent-alerts.json");
const SUBSCRIBERS_FILE = path.join(DATA_DIR, "subscribers.json");

async function loadSentAlertIds(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(ALERT_LOG_FILE, "utf8");
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

async function saveSentAlertIds(ids: Set<string>): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const recent = Array.from(ids).slice(-250);
    await fs.writeFile(ALERT_LOG_FILE, JSON.stringify(recent, null, 2), "utf8");
  } catch {
    // Graceful no-op on read-only serverless FS
  }
}

export async function loadSubscribers(): Promise<SubscriberRecord[]> {
  try {
    const raw = await fs.readFile(SUBSCRIBERS_FILE, "utf8");
    return JSON.parse(raw) as SubscriberRecord[];
  } catch {
    return [];
  }
}

export async function sendTelegramAlert(event: GeoEvent): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  const tickers = event.marketImpacts
    .slice(0, 2)
    .map((m) => `• ${m.ticker} (${m.sector}): ${m.direction.toUpperCase()}`)
    .join("\n");

  const text = [
    `🚨 *GEOPULSE BREAKING ALERT* — SEV ${event.severity}/100`,
    `*${event.countryOrZone}* (${event.region} · ${event.category})`,
    "",
    event.headline,
    "",
    `📊 *MacroSignal Impact:*`,
    tickers || "• Safe Havens / Gold (GC=F)",
    "",
    `🔗 ${event.sources[0]?.url ?? ""}`,
  ].join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function renderDailyBriefingHtml(snapshot: IntelligenceSnapshot): string {
  const topEventsHtml = snapshot.events
    .slice(0, 5)
    .map(
      (ev) => `
      <div style="border:1px solid #1e293b;border-radius:10px;padding:14px;margin-bottom:12px;background:#0b1324;">
        <div style="font-family:monospace;font-size:11px;color:#38bdf8;margin-bottom:6px;">
          SEV ${ev.severity}/100 · ${ev.countryOrZone} · ${ev.category}
        </div>
        <div style="font-size:15px;font-weight:700;color:#f8fafc;margin-bottom:6px;">${ev.headline}</div>
        <div style="font-size:13px;color:#cbd5e1;line-height:1.5;margin-bottom:8px;">${ev.whyItMattersDe}</div>
        <div style="font-family:monospace;font-size:11px;color:#34d399;">
          Märkte: ${ev.marketImpacts.map((m) => `${m.ticker} (${m.direction.toUpperCase()})`).join(" · ")}
        </div>
      </div>`
    )
    .join("");

  return `
    <div style="background:#05080f;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:28px;max-width:640px;margin:0 auto;">
      <div style="font-family:monospace;font-size:12px;color:#22d3ee;letter-spacing:2px;margin-bottom:6px;">GEOPULSE TERMINAL · 07:00 EXECUTIVE BRIEFING</div>
      <h1 style="font-size:20px;color:#ffffff;margin:0 0 8px 0;">${snapshot.briefing.headlineDe}</h1>
      <p style="font-size:13px;color:#94a3b8;margin:0 0 18px 0;">Global Risk Index: <strong style="color:#f43f5e;">${snapshot.globalRiskIndex}/100 (${snapshot.riskLabel})</strong></p>
      <div style="border-left:3px solid #10b981;padding:10px 14px;background:#071b1c;margin-bottom:20px;font-size:13px;color:#a7f3d0;">
        <strong>MacroSignal Call:</strong> ${snapshot.briefing.topMarketCallDe}
      </div>
      ${topEventsHtml}
      <p style="font-size:11px;color:#64748b;margin-top:20px;">Automatisch generiert von GeoPulse AI. Keine Anlageberatung.</p>
    </div>
  `;
}

export async function sendResendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "GeoPulse AI <briefing@geopulse.ai>";
  if (!apiKey) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
      signal: AbortSignal.timeout(7000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function dispatchBreakingAlerts(snapshot: IntelligenceSnapshot): Promise<{
  telegramSent: number;
  emailsSent: number;
  criticalCandidates: number;
}> {
  const sentIds = await loadSentAlertIds();
  const critical = snapshot.events.filter((e) => e.severity >= 78 && !sentIds.has(e.id));
  const subscribers = await loadSubscribers();

  let telegramSent = 0;
  let emailsSent = 0;

  for (const ev of critical.slice(0, 3)) {
    const tgOk = await sendTelegramAlert(ev);
    if (tgOk) telegramSent++;

    for (const sub of subscribers) {
      if (sub.plan === "pro-alerts" && ev.severity >= sub.minSeverity) {
        const html = renderDailyBriefingHtml({ ...snapshot, events: [ev] });
        const mailOk = await sendResendEmail(
          sub.email,
          `[GEOPULSE ALERT · SEV ${ev.severity}] ${ev.countryOrZone}: ${ev.headline.slice(0, 72)}`,
          html
        );
        if (mailOk) emailsSent++;
      }
    }

    sentIds.add(ev.id);
  }

  if (critical.length > 0) {
    await saveSentAlertIds(sentIds);
  }

  return { telegramSent, emailsSent, criticalCandidates: critical.length };
}

export async function dispatchDailyBriefingEmails(snapshot: IntelligenceSnapshot): Promise<{
  attempted: number;
  sent: number;
}> {
  const subscribers = await loadSubscribers();
  const html = renderDailyBriefingHtml(snapshot);
  const subject = `GeoPulse 07:00 Briefing — Global Risk ${snapshot.globalRiskIndex}/100 (${snapshot.riskLabel})`;

  let sent = 0;
  for (const sub of subscribers) {
    const ok = await sendResendEmail(sub.email, subject, html);
    if (ok) sent++;
  }
  return { attempted: subscribers.length, sent };
}
