const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
const form = document.querySelector("#registrationForm");
const whatsappInput = document.querySelector("#whatsapp");
const GOOGLE_SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbywYYZUHCxrhkqQJfCxZAvcvetHLUw8lumpry1HoI3v2gNyxRtC-cUtam-ChpeNteIZ/exec";

function closeMenu() {
  nav.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  body.classList.remove("nav-open");
}

menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  body.classList.toggle("nav-open", isOpen);
});

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

whatsappInput.addEventListener("input", () => {
  whatsappInput.value = formatWhatsapp(whatsappInput.value);
});

function validateField(field) {
  const isValid = field.checkValidity();
  field.classList.toggle("invalid", !isValid);
  return isValid;
}

form.querySelectorAll("input, select").forEach((field) => {
  field.addEventListener("blur", () => validateField(field));
  field.addEventListener("input", () => {
    if (field.classList.contains("invalid")) {
      validateField(field);
    }
  });
});

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

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fields = [...form.querySelectorAll("input, select")];
  const isValid = fields.map(validateField).every(Boolean);
  const message = form.querySelector(".form-message");
  const button = form.querySelector(".form-button");

  if (!isValid) {
    message.textContent = "Revise os campos destacados para concluir sua pré-inscrição.";
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

    message.textContent = "Pré-inscrição registrada com sucesso! Em breve entraremos em contato.";
    form.reset();
    fields.forEach((field) => field.classList.remove("invalid"));
  } catch (error) {
    message.textContent = "Não foi possível registrar sua pré-inscrição. Tente novamente em instantes.";
  } finally {
    button.disabled = false;
    button.textContent = "Quero receber as informações";
  }
});
