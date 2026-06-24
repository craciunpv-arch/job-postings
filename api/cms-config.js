const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

module.exports = (req, res) => {
  const config = yaml.load(
    fs.readFileSync(path.join(process.cwd(), "src/admin/config.yml"), "utf8")
  );

  let labels = {};
  try {
    labels = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "src/_data/cms-field-labels.json"), "utf8")
    );
  } catch (e) {}

  for (const collection of config.collections || []) {
    for (const field of collection.fields || []) {
      const key = `${collection.name}.${field.name}`;
      if (labels[key]) field.label = labels[key];
    }
  }

  res.setHeader("Content-Type", "text/yaml");
  res.status(200).send(yaml.dump(config));
};
