const markdownIt = require("markdown-it")({ html: true });
const jobStats = require("./lib/job-stats");
const trafficStats = require("./lib/traffic-stats");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/fonts");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/images");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");
  eleventyConfig.addPassthroughCopy("src/favicon-16x16.png");
  eleventyConfig.addPassthroughCopy("src/favicon-32x32.png");
  eleventyConfig.addPassthroughCopy("src/apple-touch-icon.png");

  eleventyConfig.addFilter("postDate", (date) =>
    new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(date)
  );

  eleventyConfig.addFilter("markdown", (content) => markdownIt.render(content || ""));

  eleventyConfig.addFilter("salaryRange", (min, max, currency) => {
    if (!min || !max) return "";
    const fmt = (n) => new Intl.NumberFormat("ro-RO").format(n);
    return `${fmt(min)} – ${fmt(max)} ${currency || "RON Net"}`;
  });

  eleventyConfig.addFilter("num", (n) => new Intl.NumberFormat("ro-RO").format(n));

  eleventyConfig.addFilter("jobStats", jobStats);

  eleventyConfig.addFilter("trafficStats", trafficStats);

  eleventyConfig.addFilter("selectattr", (arr, key, test, value) =>
    (arr || []).filter((item) => item.data[key] === value)
  );

  // City used to be free text ("Iasi, Cluj"); it is now a list picked in the CMS.
  eleventyConfig.addFilter("cities", (city) =>
    Array.isArray(city) ? city : String(city || "").split(", ").filter(Boolean)
  );

  // Unlisted roles are live at their own link but left out of everything on the homepage.
  eleventyConfig.addFilter("listed", (arr) => (arr || []).filter((item) => !item.data.unlisted));

  eleventyConfig.addFilter("findBySlug", (arr, slug) =>
    (arr || []).find((item) => item.fileSlug === slug)
  );

  eleventyConfig.addCollection("jobs", (api) => api.getFilteredByGlob("src/jobs/*.md"));
  eleventyConfig.addCollection("team", (api) => api.getFilteredByGlob("src/team/*.md"));
  eleventyConfig.addCollection("clients", (api) => api.getFilteredByGlob("src/clients/*.md"));

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
};
