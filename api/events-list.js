const { getSupabaseAdmin } = require("./_utils");

function normalizeEvent(eventItem) {
  return {
    id: eventItem.id,
    title: eventItem.title,
    location: eventItem.location,
    date: eventItem.event_date,
    description: eventItem.description,
    cover: eventItem.cover_url || "assets/img/video-thumb-01.svg",
    videos: [...(eventItem.event_videos || [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((video) => ({
        title: video.title,
        url: video.video_url,
        description: video.description
      })),
    testimonials: [...(eventItem.event_testimonials || [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((testimonial) => ({
        name: testimonial.name,
        role: testimonial.role,
        quote: testimonial.quote
      }))
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Metodo nao permitido." });
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("events")
    .select(`
      id,
      title,
      location,
      event_date,
      description,
      cover_url,
      created_at,
      event_videos (
        title,
        video_url,
        description,
        sort_order
      ),
      event_testimonials (
        name,
        role,
        quote,
        sort_order
      )
    `)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ events: data.map(normalizeEvent) });
};
