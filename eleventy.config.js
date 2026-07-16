const markdownIt = require("markdown-it")({ html: true });

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

  eleventyConfig.addFilter("selectattr", (arr, key, test, value) =>
    (arr || []).filter((item) => item.data[key] === value)
  );

  eleventyConfig.addFilter("findBySlug", (arr, slug) =>
    (arr || []).find((item) => item.fileSlug === slug)
  );

  eleventyConfig.addCollection("jobs", (api) => api.getFilteredByGlob("src/jobs/*.md"));
  eleventyConfig.addCollection("team", (api) => api.getFilteredByGlob("src/team/*.md"));

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
  };
};
