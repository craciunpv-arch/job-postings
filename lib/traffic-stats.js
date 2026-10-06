const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);

module.exports = function trafficStats(traffic) {
  if (!traffic || !traffic.updatedAt) return { ready: false };

  const monthLabel = (key) =>
    new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-01`));
  const currentKey = traffic.updatedAt.slice(0, 7);
  const peak = Math.max(1, ...Object.values(traffic.months).map((m) => m.visitors));
  const months = Object.entries(traffic.months)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, m]) => ({ ...m, label: monthLabel(key), current: key === currentKey, pct: (m.visitors / peak) * 100 }));

  // Vercel's own lifetime count is used when it is higher than the months saved so far.
  const reported = traffic.reportedAllTime || { visitors: 0, pageviews: 0 };
  return {
    ready: true,
    allTime: {
      visitors: Math.max(sum(months, "visitors"), reported.visitors),
      pageviews: Math.max(sum(months, "pageviews"), reported.pageviews),
    },
    month: traffic.months[currentKey] || { visitors: 0, pageviews: 0 },
    monthLabel: monthLabel(currentKey),
    months,
    topPages: traffic.topPages || [],
    topReferrers: traffic.topReferrers || [],
    updatedAt: new Date(traffic.updatedAt),
  };
};
