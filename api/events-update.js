const { getSupabaseAdmin, requireAdmin } = require("./_utils");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  if (!requireAdmin(req, res)) {
    return;
  }

  const { id, event, videos = [], testimonials = [] } = req.body || {};

  if (!id || !event || !event.title || !event.location || !event.date || !event.description) {
    res.status(400).json({ error: "Dados obrigatorios do evento incompletos." });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { error: eventError } = await supabase
    .from("events")
    .update({
      title: event.title,
      location: event.location,
      event_date: event.date,
      description: event.description,
      cover_url: event.cover || "assets/img/video-thumb-01.svg",
      is_published: true
    })
    .eq("id", id);

  if (eventError) {
    res.status(500).json({ error: eventError.message });
    return;
  }

  const { error: deleteVideosError } = await supabase.from("event_videos").delete().eq("event_id", id);
  if (deleteVideosError) {
    res.status(500).json({ error: deleteVideosError.message });
    return;
  }

  const videoRows = videos
    .filter((video) => video.title || video.url || video.description)
    .map((video, index) => ({
      event_id: id,
      title: video.title || `Video ${index + 1}`,
      video_url: video.url,
      description: video.description || "",
      sort_order: index
    }));

  if (videoRows.length) {
    const { error } = await supabase.from("event_videos").insert(videoRows);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  const { error: deleteTestimonialsError } = await supabase.from("event_testimonials").delete().eq("event_id", id);
  if (deleteTestimonialsError) {
    res.status(500).json({ error: deleteTestimonialsError.message });
    return;
  }

  const testimonialRows = testimonials
    .filter((testimonial) => testimonial.name || testimonial.role || testimonial.quote)
    .map((testimonial, index) => ({
      event_id: id,
      name: testimonial.name || "Participante",
      role: testimonial.role || "",
      quote: testimonial.quote || "",
      sort_order: index
    }));

  if (testimonialRows.length) {
    const { error } = await supabase.from("event_testimonials").insert(testimonialRows);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  res.status(200).json({ ok: true, id });
};
