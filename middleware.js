// Keeps the stats page and the CMS data files for people who can edit the site.
// api/admin-session.js sets the cookie checked here, after confirming the visitor's GitHub
// account has write access to the repository.
export const config = {
  matcher: ["/admin/stats", "/admin/stats/:path*", "/admin/jobs.json", "/admin/clients.json"],
};

const hex = (buffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function hasSession(request) {
  const secret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
  const cookie = (request.headers.get("cookie") || "").match(/(?:^|;\s*)admin_session=(\d+)\.([0-9a-f]{64})(?:;|$)/);
  if (!secret || !cookie || Number(cookie[1]) < Date.now()) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`admin-session:${cookie[1]}`)));
  // Compare every character so the time taken says nothing about where they differ.
  let different = 0;
  for (let i = 0; i < expected.length; i++) different |= expected.charCodeAt(i) ^ cookie[2].charCodeAt(i);
  return different === 0;
}

export default async function middleware(request) {
  if (await hasSession(request)) {
    return new Response(null, { headers: { "x-middleware-next": "1" } });
  }
  const url = new URL(request.url);
  if (url.pathname.endsWith(".json")) {
    return new Response(JSON.stringify({ error: "Log in to the Content Manager first" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  return Response.redirect(new URL(`/admin/login/?next=${encodeURIComponent(url.pathname)}`, url), 307);
}
