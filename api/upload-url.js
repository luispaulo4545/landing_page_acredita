const { getSafeFileName, getStorageBucket, getSupabaseAdmin, requireAdmin, slugify } = require("./_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  const { eventSlug, fileName, videoTitle } = req.body || {};
  const safeEventSlug = slugify(eventSlug) || "evento";
  const safeVideoTitle = slugify(videoTitle) || "video";
  const safeFileName = getSafeFileName(fileName);
  const path = `${safeEventSlug}/${Date.now()}-${safeVideoTitle}-${safeFileName}`;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.storage
    .from(getStorageBucket())
    .createSignedUploadUrl(path);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({
    bucket: getStorageBucket(),
    path,
    token: data.token
  });
};
