const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const COOKIE_NAME = "acredita_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

function getEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getSupabaseAdmin() {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: {
      persistSession: false
    }
  });
}

function getStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "event-videos";
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || getEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function sign(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function createSessionToken(email) {
  const payload = Buffer.from(JSON.stringify({
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE
  })).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const index = cookie.indexOf("=");
        return [cookie.slice(0, index), decodeURIComponent(cookie.slice(index + 1))];
      })
  );
}

function verifySession(req) {
  const token = parseCookies(req)[COOKIE_NAME];

  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.exp || session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return session;
  } catch (error) {
    return null;
  }
}

function setSessionCookie(res, email) {
  const token = createSessionToken(email);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${SESSION_MAX_AGE}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`);
}

function requireAdmin(req, res) {
  const session = verifySession(req);

  if (!session || String(session.email).toLowerCase() !== String(process.env.ADMIN_EMAIL || "").toLowerCase()) {
    res.status(401).json({ error: "Acesso administrativo necessario." });
    return null;
  }

  return session;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getSafeFileName(fileName) {
  const parts = String(fileName || "video.mp4").split(".");
  const extension = parts.length > 1 ? parts.pop().toLowerCase() : "mp4";
  return `${slugify(parts.join(".")) || "video"}.${extension}`;
}

module.exports = {
  clearSessionCookie,
  getSafeFileName,
  getStorageBucket,
  getSupabaseAdmin,
  requireAdmin,
  setSessionCookie,
  slugify,
  verifySession
};
