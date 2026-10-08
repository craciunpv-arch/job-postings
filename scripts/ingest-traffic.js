// Pulls visitor numbers from Vercel Web Analytics and merges them into src/_data/traffic.json.
// The Hobby plan only keeps one month of data, so each month's total is saved here and
// never lowered afterwards; the all-time figures are the sum of the saved months.
const fs = require("fs");
const path = require("path");

const API = "https://api.vercel.com/v1/query/web-analytics/visits";
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_Cg5WgnRKBKzoTGd6YwASMAxAkCaR";
const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_KsUWeKrY9NLpfapboHC5Va8S";
const LAUNCH = "2026-06-01T00:00:00.000Z";
const FILE = path.join(__dirname, "../src/_data/traffic.json");

async function query(endpoint, params) {
  const url = new URL(`${API}/${endpoint}`);
  url.search = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID, ...params });
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_ANALYTICS_TOKEN}` },
  });
  if (!response.ok) {
    throw new Error(`${endpoint} ${JSON.stringify(params)} responded ${response.status}: ${await response.text()}`);
  }
  return (await response.json()).data;
}

const attempt = (label, promise) =>
  promise.catch((error) => {
    console.warn(`Skipped ${label}: ${error.message}`);
    return null;
  });

const totals = (row) => ({ visitors: row.visitors || 0, pageviews: row.pageviews || 0 });
const highest = (a, b) => ({
  ...a,
  visitors: Math.max(a?.visitors || 0, b.visitors),
  pageviews: Math.max(a?.pageviews || 0, b.pageviews),
});
const topRows = (rows, key) =>
  (rows || [])
    .map((row) => ({ label: row[key] || "", ...totals(row) }))
    .filter((row) => row.label !== "Others" && !row.label.startsWith("/admin"))
    .sort((a, b) => b.visitors - a.visitors);

async function main() {
  if (!process.env.VERCEL_ANALYTICS_TOKEN) {
    console.log("VERCEL_ANALYTICS_TOKEN is not set; nothing saved.");
    return;
  }

  const traffic = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const now = new Date();
  const until = now.toISOString();
  const monthKey = until.slice(0, 7);
  const monthStart = `${monthKey}-01T00:00:00.000Z`;
  const windowStart = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Ask for everything since launch first; fall back to the one-month window the plan guarantees.
  const byMonth =
    (await attempt("months since launch", query("aggregate", { since: LAUNCH, until, by: "month" }))) ||
    (await query("aggregate", { since: windowStart, until, by: "month" }));
  for (const row of byMonth) {
    const key = String(row.timestamp).slice(0, 7);
    traffic.months[key] = highest(traffic.months[key], totals(row));
  }

  const thisMonth = await attempt("this month", query("count", { since: monthStart, until }));
  if (thisMonth) traffic.months[monthKey] = highest(traffic.months[monthKey], totals(thisMonth));

  const reported = await attempt("all-time count", query("count", {}));
  if (reported) traffic.reportedAllTime = highest(traffic.reportedAllTime, totals(reported));

  // Rankings cover the last 30 days so they never start from zero on the 1st.
  const range = { since: windowStart, until };
  // Enough pages to cover every role: the homepage ranks only open roles listed there, so when
  // one is filled or set to link only the next most viewed needs to be in the saved list.
  const topPages = (limit) => query("aggregate", { ...range, by: "requestPath", limit });
  const pages = (await attempt("top 50 pages", topPages(50))) || (await attempt("top pages", topPages(10)));
  const referrers = await attempt("referrers", query("aggregate", { ...range, by: "referrerHostname", limit: 8 }));
  if (pages) traffic.topPages = topRows(pages, "requestPath");
  if (referrers) {
    traffic.topReferrers = topRows(referrers, "referrerHostname").map((row) => ({ ...row, label: row.label || "Direct" }));
  }

  traffic.months = Object.fromEntries(Object.entries(traffic.months).sort());
  traffic.updatedAt = until;
  fs.writeFileSync(FILE, JSON.stringify(traffic, null, 2) + "\n");
  console.log(`Saved ${Object.keys(traffic.months).length} month(s); ${monthKey}: ${JSON.stringify(traffic.months[monthKey])}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
