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

function getStoredEvents() {
  try {
    return JSON.parse(localStorage.getItem("acreditaEvents") || "[]");
  } catch (error) {
    return [];
  }
}

function getAllEvents() {
  const defaultEvents = Array.isArray(window.ACREDITA_EVENTS) ? window.ACREDITA_EVENTS : [];
  const storedEvents = getStoredEvents();
  const eventMap = new Map();

  [...defaultEvents, ...storedEvents].forEach((eventItem) => {
    eventMap.set(eventItem.id, eventItem);
  });

  return [...eventMap.values()];
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderEventsPage() {
  const eventStack = document.querySelector("#eventStack");
  if (!eventStack) {
    return;
  }

  const events = getAllEvents();

  if (!events.length) {
    eventStack.innerHTML = '<p class="empty-state">Nenhum evento cadastrado ainda.</p>';
    return;
  }

  eventStack.innerHTML = events.map((eventItem) => {
    const videos = eventItem.videos && eventItem.videos.length
      ? eventItem.videos.map((video) => `
        <article class="video-card">
          <div class="video-frame">
            <iframe src="${escapeHtml(normalizeVideoUrl(video.url))}" title="${escapeHtml(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
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

function createVideoField(video = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-group";
  wrapper.innerHTML = `
    <input data-video-title type="text" placeholder="Titulo do video" value="${escapeHtml(video.title)}">
    <input data-video-url type="url" placeholder="Link do YouTube ou Vimeo" value="${escapeHtml(video.url)}">
    <textarea data-video-description placeholder="Descricao curta">${escapeHtml(video.description)}</textarea>
    <button class="remove-button" type="button">Remover video</button>
  `;
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

function setupEventsAdmin() {
  const adminForm = document.querySelector("#eventAdminForm");
  if (!adminForm) {
    return;
  }

  const videoFields = document.querySelector("#videoFields");
  const testimonialFields = document.querySelector("#testimonialFields");
  const output = document.querySelector("#eventsDataOutput");
  const savedEvents = document.querySelector("#savedEvents");
  const message = document.querySelector(".admin-message");

  function updateOutput() {
    const events = getAllEvents();
    output.value = `window.ACREDITA_EVENTS = ${JSON.stringify(events, null, 2)};`;
    savedEvents.innerHTML = events.map((eventItem) => `
      <article>
        <strong>${escapeHtml(eventItem.title)}</strong>
        <span>${escapeHtml(eventItem.location)} | ${escapeHtml(eventItem.date)}</span>
      </article>
    `).join("");
  }

  function resetDynamicFields() {
    videoFields.innerHTML = "";
    testimonialFields.innerHTML = "";
    videoFields.append(createVideoField());
    testimonialFields.append(createTestimonialField());
  }

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

  document.querySelector("#copyEventsData").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      message.textContent = "Arquivo copiado. Cole o conteudo em assets/js/events-data.js para publicar.";
    } catch (error) {
      output.focus();
      output.select();
      message.textContent = "Nao foi possivel copiar automaticamente. O texto foi selecionado para copia manual.";
    }
  });

  adminForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(adminForm);
    const title = formData.get("title").trim();
    const location = formData.get("location").trim();
    const date = formData.get("date").trim();

    const videos = [...videoFields.querySelectorAll(".field-group")].map((group) => ({
      title: group.querySelector("[data-video-title]").value.trim(),
      url: normalizeVideoUrl(group.querySelector("[data-video-url]").value.trim()),
      description: group.querySelector("[data-video-description]").value.trim()
    })).filter((video) => video.title || video.url || video.description);

    const testimonials = [...testimonialFields.querySelectorAll(".field-group")].map((group) => ({
      name: group.querySelector("[data-testimonial-name]").value.trim(),
      role: group.querySelector("[data-testimonial-role]").value.trim(),
      quote: group.querySelector("[data-testimonial-quote]").value.trim()
    })).filter((testimonial) => testimonial.name || testimonial.role || testimonial.quote);

    const eventItem = {
      id: `${title}-${location}-${date}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      title,
      location,
      date,
      description: formData.get("description").trim(),
      cover: formData.get("cover").trim() || "assets/img/video-thumb-01.svg",
      videos,
      testimonials
    };

    const storedEvents = getStoredEvents().filter((item) => item.id !== eventItem.id);
    storedEvents.push(eventItem);
    localStorage.setItem("acreditaEvents", JSON.stringify(storedEvents));

    adminForm.reset();
    resetDynamicFields();
    updateOutput();
    message.textContent = "Evento salvo neste navegador. Copie o arquivo gerado para publicar no site.";
  });

  resetDynamicFields();
  updateOutput();
}

renderEventsPage();
setupEventsAdmin();
