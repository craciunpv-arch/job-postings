const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);

module.exports = function trafficStats(traffic, jobs) {
  if (!traffic || !traffic.updatedAt) return { ready: false };

  const format = (options) => new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" });
  const monthDate = (key) => new Date(`${key}-01`);
  const currentKey = traffic.updatedAt.slice(0, 7);
  const peak = Math.max(1, ...Object.values(traffic.months).map((m) => m.visitors));
  const months = Object.entries(traffic.months)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, m]) => ({
      ...m,
      label: format({ month: "long", year: "numeric" }).format(monthDate(key)),
      shortLabel: format({ month: "long" }).format(monthDate(key)).slice(0, 3),
      current: key === currentKey,
      estimated: Boolean(m.estimated),
      pct: (m.visitors / peak) * 100,
    }));

  // Analytics reports paths without the trailing slash that job URLs have.
  const jobByPath = new Map((jobs || []).map((job) => [job.url.replace(/\/$/, ""), job]));
  const topRoles = (traffic.topPages || [])
    .map((row) => ({ ...row, job: jobByPath.get(row.label.replace(/\/$/, "")) }))
    .filter((row) => row.job && row.job.data.status === "Open")
    .map((row) => ({ title: row.job.data.title, url: row.job.url, visitors: row.visitors }));

  // Vercel's own lifetime count is used when it is higher than the months saved so far.
  const reported = traffic.reportedAllTime || { visitors: 0, pageviews: 0 };
  return {
    ready: true,
    allTime: {
      visitors: Math.max(sum(months, "visitors"), reported.visitors),
      pageviews: Math.max(sum(months, "pageviews"), reported.pageviews),
    },
    month: traffic.months[currentKey] || { visitors: 0, pageviews: 0 },
    monthLabel: format({ month: "long", year: "numeric" }).format(monthDate(currentKey)),
    months,
    recentMonths: months.slice(0, 6).reverse(),
    hasEstimates: months.some((m) => m.estimated),
    topRoles,
    topPages: traffic.topPages || [],
    topReferrers: traffic.topReferrers || [],
    updatedAt: new Date(traffic.updatedAt),
  };
};
