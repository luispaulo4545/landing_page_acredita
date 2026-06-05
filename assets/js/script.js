const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const form = document.querySelector("#registrationForm");
const whatsappInput = document.querySelector("#whatsapp");
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbywYYZUHCxrhkqQJfCxZAvcvetHLUw8lumpry1HoI3v2gNyxRtC-cUtam-ChpeNteIZ/exec";

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

function getFallbackEvents() {
  return Array.isArray(window.ACREDITA_EVENTS) ? window.ACREDITA_EVENTS : [];
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Nao foi possivel concluir a operacao.");
  }

  return payload;
}

async function fetchApiEvents() {
  const payload = await requestJson("/api/events-list", {
    method: "GET",
    headers: {}
  });

  return payload.events || [];
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
    renderEventCards(await fetchApiEvents(), eventStack);
  } catch (error) {
    renderEventCards(getFallbackEvents(), eventStack);
  }
}

function createVideoField(video = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-group";
  wrapper.dataset.existingUrl = video.url || "";
  wrapper.innerHTML = `
    <input data-video-title type="text" placeholder="Titulo do video" value="${escapeHtml(video.title)}">
    <label class="upload-control">
      <input data-video-file type="file" accept="video/mp4,video/webm,video/quicktime,video/*">
      <span>Selecionar video do computador</span>
    </label>
    <small class="selected-file" data-selected-file>${video.url ? "Video atual mantido" : "Nenhum arquivo selecionado"}</small>
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

async function uploadVideoFile(file, eventSlug, videoTitle) {
  const config = window.ACREDITA_SUPABASE || {};
  const maxVideoSizeMb = Number(config.maxVideoSizeMb || 50);
  const maxVideoSizeBytes = maxVideoSizeMb * 1024 * 1024;

  if (file.size > maxVideoSizeBytes) {
    throw new Error(`O video "${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)} MB. O limite atual e ${maxVideoSizeMb} MB.`);
  }

  const uploadData = await requestJson("/api/upload-url", {
    method: "POST",
    body: JSON.stringify({
      eventSlug,
      fileName: file.name,
      videoTitle
    })
  });

  if (!window.supabase || !config.url || !config.anonKey) {
    throw new Error("Configure o Supabase publico em assets/js/supabase-config.js.");
  }

  const uploadClient = window.supabase.createClient(config.url, config.anonKey);
  const { error } = await uploadClient.storage
    .from(uploadData.bucket)
    .uploadToSignedUrl(uploadData.path, uploadData.token, file, {
      contentType: file.type || "application/octet-stream"
    });

  if (error) {
    throw error;
  }

  return `${config.url}/storage/v1/object/public/${uploadData.bucket}/${uploadData.path}`;
}

function setupEventsAdmin() {
  const adminForm = document.querySelector("#eventAdminForm");
  if (!adminForm) {
    return;
  }

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
  const cancelEditButton = document.querySelector("#cancelEditEvent");
  let adminEvents = [];

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

  function resetAdminState() {
    adminForm.reset();
    document.querySelector("#eventId").value = "";
    cancelEditButton.hidden = true;
    submitButton.textContent = "Salvar evento";
    resetDynamicFields();
  }

  function loadEventForEdit(eventItem) {
    document.querySelector("#eventId").value = eventItem.id;
    adminForm.elements.title.value = eventItem.title || "";
    adminForm.elements.location.value = eventItem.location || "";
    adminForm.elements.date.value = eventItem.date || "";
    adminForm.elements.cover.value = eventItem.cover || "";
    adminForm.elements.description.value = eventItem.description || "";

    videoFields.innerHTML = "";
    (eventItem.videos && eventItem.videos.length ? eventItem.videos : [{}]).forEach((video) => {
      videoFields.append(createVideoField(video));
    });

    testimonialFields.innerHTML = "";
    (eventItem.testimonials && eventItem.testimonials.length ? eventItem.testimonials : [{}]).forEach((testimonial) => {
      testimonialFields.append(createTestimonialField(testimonial));
    });

    cancelEditButton.hidden = false;
    submitButton.textContent = "Atualizar evento";
    message.textContent = "Editando evento existente.";
    adminForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function refreshAdminEvents() {
    try {
      adminEvents = await fetchApiEvents();
      savedEvents.innerHTML = adminEvents.length
        ? adminEvents.map((eventItem) => `
          <article>
            <strong>${escapeHtml(eventItem.title)}</strong>
            <span>${escapeHtml(eventItem.location)} | ${escapeHtml(eventItem.date)}</span>
            <button class="secondary-button edit-event-button" type="button" data-edit-event="${escapeHtml(eventItem.id)}">Editar</button>
          </article>
        `).join("")
        : '<p class="empty-state">Nenhum evento salvo ainda.</p>';
    } catch (error) {
      savedEvents.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
    }
  }

  requestJson("/api/admin-session", {
    method: "GET",
    headers: {}
  }).then((session) => {
    if (session.authenticated) {
      unlockAdmin();
      refreshAdminEvents();
    }
  }).catch(() => {});

  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminLoginMessage.textContent = "Validando acesso...";

    try {
      await requestJson("/api/admin-login", {
        method: "POST",
        body: JSON.stringify({
          email: adminEmail.value,
          password: adminPassword.value
        })
      });

      adminLoginMessage.textContent = "";
      adminPassword.value = "";
      unlockAdmin();
      refreshAdminEvents();
    } catch (error) {
      adminLoginMessage.textContent = error.message;
      adminPassword.value = "";
      adminPassword.focus();
    }
  });

  document.querySelector("[data-add-video]").addEventListener("click", () => {
    videoFields.append(createVideoField());
  });

  document.querySelector("[data-add-testimonial]").addEventListener("click", () => {
    testimonialFields.append(createTestimonialField());
  });

  document.querySelector("#resetAdminForm").addEventListener("click", () => {
    resetAdminState();
    message.textContent = "";
  });

  cancelEditButton.addEventListener("click", () => {
    resetAdminState();
    message.textContent = "";
  });

  savedEvents.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-event]");
    if (!editButton) {
      return;
    }

    const eventItem = adminEvents.find((item) => item.id === editButton.dataset.editEvent);
    if (eventItem) {
      loadEventForEdit(eventItem);
    }
  });

  document.querySelector("#logoutAdmin").addEventListener("click", async () => {
    await requestJson("/api/admin-logout", {
      method: "POST",
      body: "{}"
    }).catch(() => {});

    lockAdmin();
    adminEmail.value = "";
    adminPassword.value = "";
    adminEmail.focus();
  });

  document.querySelector("#refreshAdminEvents").addEventListener("click", refreshAdminEvents);

  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(adminForm);
    const eventId = formData.get("eventId");
    const title = formData.get("title").trim();
    const eventSlug = slugify(`${title}-${formData.get("location")}-${formData.get("date")}`);
    const videoGroups = [...videoFields.querySelectorAll(".field-group")];
    const testimonialGroups = [...testimonialFields.querySelectorAll(".field-group")];

    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    message.textContent = "Enviando videos e salvando evento...";

    try {
      const videos = [];
      for (const [index, group] of videoGroups.entries()) {
        const file = group.querySelector("[data-video-file]").files[0];
        const videoTitle = group.querySelector("[data-video-title]").value.trim();
        const description = group.querySelector("[data-video-description]").value.trim();

        if (!file && !videoTitle && !description) {
          continue;
        }

        const existingUrl = group.dataset.existingUrl || "";
        if (!file && !existingUrl) {
          throw new Error("Selecione o arquivo de todos os videos preenchidos.");
        }

        let videoUrl = existingUrl;
        if (file) {
          message.textContent = `Enviando video ${index + 1}...`;
          videoUrl = await uploadVideoFile(file, eventSlug, videoTitle || `Video ${index + 1}`);
        }

        videos.push({
          title: videoTitle || `Video ${index + 1}`,
          url: videoUrl,
          description
        });
      }

      const testimonials = testimonialGroups.map((group) => ({
        name: group.querySelector("[data-testimonial-name]").value.trim(),
        role: group.querySelector("[data-testimonial-role]").value.trim(),
        quote: group.querySelector("[data-testimonial-quote]").value.trim()
      })).filter((testimonial) => testimonial.name || testimonial.role || testimonial.quote);

      message.textContent = "Publicando evento...";
      await requestJson(eventId ? "/api/events-update" : "/api/events-create", {
        method: "POST",
        body: JSON.stringify({
          id: eventId || undefined,
          event: {
            title,
            location: formData.get("location").trim(),
            date: formData.get("date").trim(),
            description: formData.get("description").trim(),
            cover: formData.get("cover").trim() || "assets/img/video-thumb-01.svg"
          },
          videos,
          testimonials
        })
      });

      resetAdminState();
      await refreshAdminEvents();
      message.textContent = eventId ? "Evento atualizado com sucesso." : "Evento publicado com sucesso.";
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
