const crypto = require("crypto");

// Pages under /admin that are not the CMS itself (stats, job and client data) are only for people
// who can edit the site. The CMS login token is checked against GitHub here; collaborators with
// write access get a signed cookie that middleware.js looks for.
const REPO = "craciunpv-arch/job-postings";
const HOURS = 12;

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const secret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Missing OAUTH_GITHUB_CLIENT_SECRET environment variable" });
    return;
  }
  const token = req.body && typeof req.body.token === "string" ? req.body.token : "";
  if (!token) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }

  const response = await fetch(`https://api.github.com/repos/${REPO}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "job-postings-admin",
    },
  });
  if (!response.ok) {
    res.status(401).json({ error: "GitHub did not accept this login" });
    return;
  }
  const repo = await response.json();
  if (!repo.permissions || !repo.permissions.push) {
    res.status(403).json({ error: "This GitHub account cannot edit the site" });
    return;
  }

  const expires = String(Date.now() + HOURS * 60 * 60 * 1000);
  const signature = crypto.createHmac("sha256", secret).update(`admin-session:${expires}`).digest("hex");
  res.setHeader(
    "Set-Cookie",
    `admin_session=${expires}.${signature}; Path=/admin; Max-Age=${HOURS * 60 * 60}; HttpOnly; Secure; SameSite=Lax`
  );
  res.status(200).json({ ok: true });
};
