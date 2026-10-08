const AI_TAGS = ["ML", "LLM", "LLMs"];
const DEFAULT_CURRENCY = "RON Net";
const SCALE_STEP = 2000;
const WORKING_TYPES = ["Remote", "Hybrid", "Onsite"];

const avg = (xs) => xs.reduce((sum, x) => sum + x, 0) / xs.length;
const round100 = (n) => Math.round(n / 100) * 100;
const median = (xs) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
};

const seniorityLabel = (levels) =>
  levels.length === 1 ? `${levels[0]} only` : levels.join(" or ");

module.exports = function jobStats(jobs, site = {}) {
  const roles = (jobs || []).map((job) => {
    const d = job.data;
    // Salary stats only compare roles paid in the default currency.
    const paid =
      d.salaryMin && d.salaryMax && (d.salaryCurrency || DEFAULT_CURRENCY) === DEFAULT_CURRENCY;
    const levels = d.seniority || [];
    const techStack = d.techStack || [];
    return {
      title: d.title,
      url: job.url,
      open: d.status === "Open",
      unlisted: Boolean(d.unlisted),
      min: paid ? d.salaryMin : null,
      max: paid ? d.salaryMax : null,
      mid: paid ? (d.salaryMin + d.salaryMax) / 2 : null,
      seniority: levels.join(" / "),
      seniorityGroup: levels.length ? seniorityLabel(levels) : "",
      workingType: d.workingType,
      city: [].concat(d.city || []).join(", "),
      roleType: d.roleType || "",
      techStack,
      ai: techStack.some((tag) => AI_TAGS.includes(tag)),
      date: d.date,
    };
  });

  if (!roles.length) return { total: 0 };

  const paidRoles = roles.filter((r) => r.mid !== null);
  const salaryMin = Math.min(...paidRoles.map((r) => r.min));
  const salaryMax = Math.max(...paidRoles.map((r) => r.max));
  const lo = Math.floor(salaryMin / SCALE_STEP) * SCALE_STEP;
  const hi = Math.max(Math.ceil(salaryMax / SCALE_STEP) * SCALE_STEP, lo + SCALE_STEP);
  const pct = (value) => ((value - lo) / (hi - lo)) * 100;
  const bar = (min, max) => ({ left: pct(min), width: pct(max) - pct(min) });

  const ticks = [];
  for (let value = lo; value <= hi; value += SCALE_STEP * 2) ticks.push({ value, pct: pct(value) });

  const summarize = (label, group) => {
    const paid = group.filter((r) => r.mid !== null);
    const summary = {
      label,
      count: group.length,
      open: group.filter((r) => r.open).length,
      linkOnly: group.filter((r) => r.open && r.unlisted).length,
    };
    if (paid.length) {
      summary.avgMin = round100(avg(paid.map((r) => r.min)));
      summary.avgMax = round100(avg(paid.map((r) => r.max)));
      summary.medianMid = median(paid.map((r) => r.mid));
      summary.bar = bar(summary.avgMin, summary.avgMax);
    }
    return summary;
  };

  const groupBy = (key) => {
    const labels = [...new Set(roles.map((r) => r[key]).filter(Boolean))];
    return labels
      .map((label) => summarize(label, roles.filter((r) => r[key] === label)))
      .sort((a, b) => (b.avgMin || 0) + (b.avgMax || 0) - ((a.avgMin || 0) + (a.avgMax || 0)));
  };

  const medianMid = median(paidRoles.map((r) => r.mid));

  // The homepage card shows salaries for roles that are open now.
  const openPaid = paidRoles.filter((r) => r.open);
  let current = null;
  if (openPaid.length) {
    const min = Math.min(...openPaid.map((r) => r.min));
    const max = Math.max(...openPaid.map((r) => r.max));
    const mid = median(openPaid.map((r) => r.mid));
    // Leave room either side of the range so the bar reads as a band.
    const cardLo = Math.floor((min * 0.7) / 1000) * 1000;
    const cardHi = Math.ceil((max * 1.15) / 1000) * 1000;
    const cardPct = (value) => ((value - cardLo) / (cardHi - cardLo)) * 100;
    current = { min, max, mid, bar: { left: cardPct(min), width: cardPct(max) - cardPct(min), mid: cardPct(mid) } };
  }

  const firstDate = new Date(Math.min(...roles.map((r) => r.date)));

  return {
    total: roles.length,
    open: roles.filter((r) => r.open).length,
    since: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(firstDate),
    salaryMin,
    salaryMax,
    medianMid,
    current,
    aiCount: roles.filter((r) => r.ai).length,
    aiShare: Math.round((roles.filter((r) => r.ai).length / roles.length) * 100),
    aiTags: AI_TAGS,
    working: WORKING_TYPES.map((type) => summarize(type, roles.filter((r) => r.workingType === type))),
    seniority: groupBy("seniorityGroup"),
    roleTypes: groupBy("roleType"),
    untypedCount: roles.filter((r) => !r.roleType).length,
    scale: { ticks, divisions: (hi - lo) / SCALE_STEP, medianPct: pct(medianMid) },
    roles: paidRoles
      .map((r) => ({ ...r, bar: bar(r.min, r.max) }))
      .sort((a, b) => b.mid - a.mid || b.max - a.max || b.open - a.open),
    rolesByDate: [...roles].sort((a, b) => b.date - a.date || (b.mid || 0) - (a.mid || 0)),
  };
};
