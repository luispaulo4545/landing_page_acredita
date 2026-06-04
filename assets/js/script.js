const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const form = document.querySelector("#registrationForm");
const whatsappInput = document.querySelector("#whatsapp");
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbywYYZUHCxrhkqQJfCxZAvcvetHLUw8lumpry1HoI3v2gNyxRtC-cUtam-ChpeNteIZ/exec";

let supabaseClient = null;

function closeMenu() {
  if (!nav || !menuToggle) {
    return;
  }

  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  body.classList.remove("nav-open");
}

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    body.classList.toggle("nav-open", isOpen);
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));

    if (!target) {
      return;
    }

    event.preventDefault();
    closeMenu();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

function formatWhatsapp(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }

  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

if (whatsappInput) {
  whatsappInput.addEventListener("input", () => {
    whatsappInput.value = formatWhatsapp(whatsappInput.value);
  });
}

function validateField(field) {
  const isValid = field.checkValidity();
  field.classList.toggle("invalid", !isValid);
  return isValid;
}

if (form) {
  form.querySelectorAll("input, select").forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => {
      if (field.classList.contains("invalid")) {
        validateField(field);
      }
    });
  });
}

function getFormData() {
  const data = new FormData(form);

  return {
    timestamp: new Date().toISOString(),
    name: data.get("name"),
    profession: data.get("profession"),
    institution: data.get("institution"),
    city: data.get("city"),
    whatsapp: data.get("whatsapp"),
    email: data.get("email"),
    area: data.get("area"),
    interest: data.get("interest"),
    page: window.location.href
  };
}

function getEncodedFormData() {
  const payload = getFormData();
  const params = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    params.append(key, value || "");
  });

  return params;
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fields = [...form.querySelectorAll("input, select")];
    const isValid = fields.map(validateField).every(Boolean);
    const message = form.querySelector(".form-message");
    const button = form.querySelector(".form-button");

    if (!isValid) {
      message.textContent = "Revise os campos destacados para concluir sua pre-inscricao.";
      return;
    }

    if (!GOOGLE_SHEETS_WEB_APP_URL) {
      message.textContent = "Configure a URL do Google Sheets no arquivo assets/js/script.js.";
      return;
    }

    button.disabled = true;
    button.textContent = "Enviando...";
    message.textContent = "";

    try {
      await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        },
        body: getEncodedFormData()
      });

      message.textContent = "Pre-inscricao registrada com sucesso! Em breve entraremos em contato.";
      form.reset();
      fields.forEach((field) => field.classList.remove("invalid"));
    } catch (error) {
      message.textContent = "Nao foi possivel registrar sua pre-inscricao. Tente novamente em instantes.";
    } finally {
      button.disabled = false;
      button.textContent = "Quero receber as informacoes";
    }
  });
}

function getSupabaseClient() {
  const config = window.ACREDITA_SUPABASE || {};

  if (supabaseClient) {
    return supabaseClient;
  }

  if (!config.url || !config.anonKey || !window.supabase) {
    return null;
  }

  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  return supabaseClient;
}

function getStorageBucket() {
  return (window.ACREDITA_SUPABASE && window.ACREDITA_SUPABASE.storageBucket) || "event-videos";
}

function getFallbackEvents() {
  return Array.isArray(window.ACREDITA_EVENTS) ? window.ACREDITA_EVENTS : [];
}

async function fetchSupabaseEvents() {
  const client = getSupabaseClient();

  if (!client) {
    return null;
  }

  const { data, error } = await client
    .from("events")
    .select(`
      id,
      title,
      location,
      event_date,
      description,
      cover_url,
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
    throw error;
  }

  return data.map((eventItem) => ({
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
  }));
}

function normalizeVideoUrl(url) {
  if (!url) {
    return "";
  }

  if (url.includes("youtube.com/embed") || url.includes("player.vimeo.com")) {
    return url;
  }

  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return url;
}

function isEmbedUrl(url) {
  return url.includes("youtube.com/embed") || url.includes("player.vimeo.com");
}

function renderVideoPlayer(video) {
  const url = normalizeVideoUrl(video.url || "");

  if (isEmbedUrl(url)) {
    return `<iframe src="${escapeHtml(url)}" title="${escapeHtml(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  }

  return `<video src="${escapeHtml(url)}" controls preload="metadata"></video>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderEventCards(events, eventStack) {
  if (!events.length) {
    eventStack.innerHTML = '<p class="empty-state">Nenhum evento cadastrado ainda.</p>';
    return;
  }

  eventStack.innerHTML = events.map((eventItem) => {
    const videos = eventItem.videos && eventItem.videos.length
      ? eventItem.videos.map((video) => `
        <article class="video-card">
          <div class="video-frame">
            ${renderVideoPlayer(video)}
          </div>
          <h4>${escapeHtml(video.title)}</h4>
          <p>${escapeHtml(video.description)}</p>
        </article>
      `).join("")
      : '<p class="empty-state">Os videos deste evento serao adicionados em breve.</p>';

    const testimonials = eventItem.testimonials && eventItem.testimonials.length
      ? eventItem.testimonials.map((testimonial) => `
        <blockquote class="testimonial-card">
          <p>${escapeHtml(testimonial.quote)}</p>
          <cite>${escapeHtml(testimonial.name)} <span>${escapeHtml(testimonial.role)}</span></cite>
        </blockquote>
      `).join("")
      : '<p class="empty-state">Ainda nao ha depoimentos para este evento.</p>';

    return `
      <article class="event-block">
        <div class="event-summary">
          <img src="${escapeHtml(eventItem.cover || "assets/img/video-thumb-01.svg")}" alt="">
          <div>
            <span>${escapeHtml(eventItem.location)} | ${escapeHtml(eventItem.date)}</span>
            <h2>${escapeHtml(eventItem.title)}</h2>
            <p>${escapeHtml(eventItem.description)}</p>
          </div>
        </div>
        <div class="event-content-grid">
          <section>
            <h3>Videos do evento</h3>
            <div class="video-grid">${videos}</div>
          </section>
          <section>
            <h3>Depoimentos</h3>
            <div class="testimonial-grid">${testimonials}</div>
          </section>
        </div>
      </article>
    `;
  }).join("");
}

async function renderEventsPage() {
  const eventStack = document.querySelector("#eventStack");
  if (!eventStack) {
    return;
  }

  eventStack.innerHTML = '<p class="empty-state">Carregando eventos...</p>';

  try {
    const supabaseEvents = await fetchSupabaseEvents();
    renderEventCards(supabaseEvents || getFallbackEvents(), eventStack);
  } catch (error) {
    renderEventCards(getFallbackEvents(), eventStack);
  }
}

function createVideoField(video = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-group";
  wrapper.innerHTML = `
    <input data-video-title type="text" placeholder="Titulo do video" value="${escapeHtml(video.title)}">
    <label class="upload-control">
      <input data-video-file type="file" accept="video/mp4,video/webm,video/quicktime,video/*">
      <span>Selecionar video do computador</span>
    </label>
    <small class="selected-file" data-selected-file>Nenhum arquivo selecionado</small>
    <textarea data-video-description placeholder="Descricao curta">${escapeHtml(video.description)}</textarea>
    <button class="remove-button" type="button">Remover video</button>
  `;
  wrapper.querySelector("[data-video-file]").addEventListener("change", (event) => {
    const file = event.target.files[0];
    wrapper.querySelector("[data-selected-file]").textContent = file ? file.name : "Nenhum arquivo selecionado";
  });
  wrapper.querySelector(".remove-button").addEventListener("click", () => wrapper.remove());
  return wrapper;
}

function createTestimonialField(testimonial = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-group";
  wrapper.innerHTML = `
    <input data-testimonial-name type="text" placeholder="Nome" value="${escapeHtml(testimonial.name)}">
    <input data-testimonial-role type="text" placeholder="Cargo ou area" value="${escapeHtml(testimonial.role)}">
    <textarea data-testimonial-quote placeholder="Depoimento">${escapeHtml(testimonial.quote)}</textarea>
    <button class="remove-button" type="button">Remover depoimento</button>
  `;
  wrapper.querySelector(".remove-button").addEventListener("click", () => wrapper.remove());
  return wrapper;
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
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? parts.pop().toLowerCase() : "mp4";
  return `${slugify(parts.join(".")) || "video"}.${extension}`;
}

async function uploadVideoFile(file, eventSlug, videoTitle) {
  const client = getSupabaseClient();
  const path = `${eventSlug}/${Date.now()}-${slugify(videoTitle)}-${getSafeFileName(file.name)}`;

  const { error } = await client.storage
    .from(getStorageBucket())
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from(getStorageBucket()).getPublicUrl(path);
  return data.publicUrl;
}

async function isCurrentUserAdmin() {
  const client = getSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError || !userData.user) {
    return false;
  }

  const { data, error } = await client
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (error) {
    return false;
  }

  return data.role === "admin";
}

function setupEventsAdmin() {
  const adminForm = document.querySelector("#eventAdminForm");
  if (!adminForm) {
    return;
  }

  const client = getSupabaseClient();
  const adminLoginSection = document.querySelector("#adminLoginSection");
  const adminSection = document.querySelector("#eventAdminSection");
  const adminLoginForm = document.querySelector("#adminLoginForm");
  const adminEmail = document.querySelector("#adminEmail");
  const adminPassword = document.querySelector("#adminPassword");
  const adminLoginMessage = document.querySelector(".admin-login-message");
  const videoFields = document.querySelector("#videoFields");
  const testimonialFields = document.querySelector("#testimonialFields");
  const savedEvents = document.querySelector("#savedEvents");
  const message = document.querySelector(".admin-message");
  const submitButton = adminForm.querySelector('button[type="submit"]');

  function unlockAdmin() {
    adminLoginSection.hidden = true;
    adminSection.hidden = false;
    adminSection.classList.remove("is-locked");
  }

  function lockAdmin() {
    adminLoginSection.hidden = false;
    adminSection.hidden = true;
    adminSection.classList.add("is-locked");
  }

  function resetDynamicFields() {
    videoFields.innerHTML = "";
    testimonialFields.innerHTML = "";
    videoFields.append(createVideoField());
    testimonialFields.append(createTestimonialField());
  }

  async function refreshAdminEvents() {
    if (!client) {
      savedEvents.innerHTML = '<p class="empty-state">Configure o Supabase em assets/js/supabase-config.js.</p>';
      return;
    }

    const { data, error } = await client
      .from("events")
      .select("title, location, event_date, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      savedEvents.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
      return;
    }

    savedEvents.innerHTML = data.length
      ? data.map((eventItem) => `
        <article>
          <strong>${escapeHtml(eventItem.title)}</strong>
          <span>${escapeHtml(eventItem.location)} | ${escapeHtml(eventItem.event_date)}</span>
        </article>
      `).join("")
      : '<p class="empty-state">Nenhum evento salvo no Supabase ainda.</p>';
  }

  if (!client) {
    adminLoginMessage.textContent = "Configure URL e anon key do Supabase em assets/js/supabase-config.js.";
  } else {
    client.auth.getSession().then(async ({ data }) => {
      if (data.session && await isCurrentUserAdmin()) {
        unlockAdmin();
        refreshAdminEvents();
      }
    });
  }

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!client) {
      adminLoginMessage.textContent = "Supabase ainda nao configurado.";
      return;
    }

    adminLoginMessage.textContent = "Validando acesso...";

    const { error } = await client.auth.signInWithPassword({
      email: adminEmail.value,
      password: adminPassword.value
    });

    if (error) {
      adminLoginMessage.textContent = "E-mail ou senha invalidos.";
      adminPassword.value = "";
      adminPassword.focus();
      return;
    }

    if (!await isCurrentUserAdmin()) {
      await client.auth.signOut();
      adminLoginMessage.textContent = "Este usuario nao tem permissao de administrador.";
      return;
    }

    adminLoginMessage.textContent = "";
    adminPassword.value = "";
    unlockAdmin();
    refreshAdminEvents();
  });

  document.querySelector("[data-add-video]").addEventListener("click", () => {
    videoFields.append(createVideoField());
  });

  document.querySelector("[data-add-testimonial]").addEventListener("click", () => {
    testimonialFields.append(createTestimonialField());
  });

  document.querySelector("#resetAdminForm").addEventListener("click", () => {
    adminForm.reset();
    resetDynamicFields();
    message.textContent = "";
  });

  document.querySelector("#logoutAdmin").addEventListener("click", async () => {
    if (client) {
      await client.auth.signOut();
    }

    lockAdmin();
    adminEmail.value = "";
    adminPassword.value = "";
    adminEmail.focus();
  });

  document.querySelector("#refreshAdminEvents").addEventListener("click", refreshAdminEvents);

  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!client) {
      message.textContent = "Supabase ainda nao configurado.";
      return;
    }

    if (!await isCurrentUserAdmin()) {
      message.textContent = "Sessao sem permissao de administrador.";
      lockAdmin();
      return;
    }

    const formData = new FormData(adminForm);
    const title = formData.get("title").trim();
    const eventSlug = slugify(`${title}-${formData.get("location")}-${formData.get("date")}`);
    const videoGroups = [...videoFields.querySelectorAll(".field-group")];
    const testimonialGroups = [...testimonialFields.querySelectorAll(".field-group")];

    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    message.textContent = "Enviando videos e salvando evento...";

    try {
      const { data: userData } = await client.auth.getUser();
      const { data: insertedEvent, error: eventError } = await client
        .from("events")
        .insert({
          title,
          location: formData.get("location").trim(),
          event_date: formData.get("date").trim(),
          description: formData.get("description").trim(),
          cover_url: formData.get("cover").trim() || "assets/img/video-thumb-01.svg",
          is_published: true,
          created_by: userData.user.id
        })
        .select("id")
        .single();

      if (eventError) {
        throw eventError;
      }

      const videos = [];
      for (const [index, group] of videoGroups.entries()) {
        const file = group.querySelector("[data-video-file]").files[0];
        const videoTitle = group.querySelector("[data-video-title]").value.trim();
        const description = group.querySelector("[data-video-description]").value.trim();

        if (!file && !videoTitle && !description) {
          continue;
        }

        if (!file) {
          throw new Error("Selecione o arquivo de todos os videos preenchidos.");
        }

        const videoUrl = await uploadVideoFile(file, eventSlug, videoTitle || `Video ${index + 1}`);
        videos.push({
          event_id: insertedEvent.id,
          title: videoTitle || `Video ${index + 1}`,
          video_url: videoUrl,
          description,
          sort_order: index
        });
      }

      if (videos.length) {
        const { error: videosError } = await client.from("event_videos").insert(videos);
        if (videosError) {
          throw videosError;
        }
      }

      const testimonials = testimonialGroups.map((group, index) => ({
        event_id: insertedEvent.id,
        name: group.querySelector("[data-testimonial-name]").value.trim(),
        role: group.querySelector("[data-testimonial-role]").value.trim(),
        quote: group.querySelector("[data-testimonial-quote]").value.trim(),
        sort_order: index
      })).filter((testimonial) => testimonial.name || testimonial.role || testimonial.quote);

      if (testimonials.length) {
        const { error: testimonialsError } = await client.from("event_testimonials").insert(testimonials);
        if (testimonialsError) {
          throw testimonialsError;
        }
      }

      adminForm.reset();
      resetDynamicFields();
      await refreshAdminEvents();
      message.textContent = "Evento publicado com sucesso.";
    } catch (error) {
      message.textContent = error.message || "Nao foi possivel salvar o evento.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Salvar evento";
    }
  });

  resetDynamicFields();
  refreshAdminEvents();
}

renderEventsPage();
setupEventsAdmin();
