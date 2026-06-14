function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const [key, ...v] = part.trim().split("=");
        return [key, decodeURIComponent(v.join("="))];
      })
  );
}

function renderScript(status, payload) {
  return `<!DOCTYPE html>
<html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:${status}:' + JSON.stringify(${JSON.stringify(payload)}),
      e.origin
    );
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body></html>`;
}

module.exports = async (req, res) => {
  const { code, state } = req.query;
  const cookies = parseCookies(req.headers.cookie || "");

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Set-Cookie", "decap_oauth_state=; Path=/; Max-Age=0");

  if (!code || !state || state !== cookies.decap_oauth_state) {
    res.status(401).send(renderScript("error", { message: "Invalid OAuth state" }));
    return;
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const redirectUri = `${proto}://${host}/api/callback`;

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.OAUTH_GITHUB_CLIENT_ID,
      client_secret: process.env.OAUTH_GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const data = await tokenResponse.json();

  if (data.error || !data.access_token) {
    res.status(401).send(renderScript("error", { message: data.error_description || "Authorization failed" }));
    return;
  }

  res.status(200).send(renderScript("success", { token: data.access_token, provider: "github" }));
};
