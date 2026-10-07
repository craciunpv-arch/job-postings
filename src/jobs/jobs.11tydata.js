// Each job has one Visibility setting in the CMS: "Open" (on the homepage), "Link only" or "Filled".
// The templates and stats read it as a status plus an unlisted flag.
module.exports = {
  layout: "layouts/job.njk",
  tags: ["jobs"],
  permalink: "/{{ page.fileSlug }}/",
  eleventyComputed: {
    title: "{{ title }}",
    description: "{{ title }} — {{ city | join: ', ' }}, {{ workingType }} — {{ salary }}",
    status: (data) => (data.visibility === "Filled" ? "Closed" : "Open"),
    unlisted: (data) => data.visibility === "Link only",
  },
};
