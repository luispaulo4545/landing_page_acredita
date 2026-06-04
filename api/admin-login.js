const { setSessionCookie } = require("./_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  const { email, password } = req.body || {};

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: "Credenciais do ADM nao configuradas na Vercel." });
    return;
  }

  if (String(email).toLowerCase() !== String(process.env.ADMIN_EMAIL).toLowerCase() || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "E-mail ou senha invalidos." });
    return;
  }

  setSessionCookie(res, email);
  res.status(200).json({ ok: true });
};
