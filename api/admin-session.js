const { verifySession } = require("./_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  const session = verifySession(req);
  res.status(200).json({
    authenticated: Boolean(session && String(session.email).toLowerCase() === String(process.env.ADMIN_EMAIL || "").toLowerCase())
  });
};
