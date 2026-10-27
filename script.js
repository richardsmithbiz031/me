const specials = [
  {
    title: "Saffron Chicken Tagine",
    note: "Slow-braised chicken with apricot, olives, and warm spice, served with couscous.",
  },
  {
    title: "Fire-Roasted Sea Bass",
    note: "Citrus, fennel, and herb butter with a bright lemon-sesame finish.",
  },
  {
    title: "Coconut Jollof Bowl",
    note: "A smoky, peppery rice dish layered with grilled greens and charred tomato.",
  },
  {
    title: "Miso Tofu Forest Plate",
    note: "Silken tofu, shiitake broth, and seasonal vegetables with ginger-lime dressing.",
  },
];

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");
const dateInput = document.querySelector('input[name="date"]');
const reserveForm = document.querySelector("#reserve");
const messageEl = reserveForm?.querySelector(".form-message");
const specialTitleEl = document.querySelector("#special-title");
const specialNoteEl = document.querySelector("#special-note");

function getTodaySpecial(date = new Date()) {
  const index = date.getDay() % specials.length;
  return specials[index];
}

const setMessage = (text, tone = "neutral") => {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.dataset.tone = tone;
};

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");

    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation"
    );
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
    });
  });
}

if (specialTitleEl && specialNoteEl) {
  const todaySpecial = getTodaySpecial();
  specialTitleEl.textContent = todaySpecial.title;
  specialNoteEl.textContent = todaySpecial.note;
}

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector(".filter.active")?.classList.remove("active");
    button.classList.add("active");

    const selectedCuisine = button.dataset.filter;

    document.querySelectorAll(".dish-card").forEach((card) => {
      const shouldShow =
        selectedCuisine === "all" ||
        card.dataset.cuisine === selectedCuisine;

      card.hidden = !shouldShow;
      card.style.opacity = shouldShow ? "1" : "0.2";
      card.style.transform = shouldShow ? "translateY(0)" : "translateY(4px)";
    });
  });
});

function getLocalToday() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

if (dateInput) {
  dateInput.min = getLocalToday();
}

async function readJsonResponse(response) {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    const message = rawText.slice(0, 140).replace(/\s+/g, " ").trim();
    throw new Error(
      message && message.includes("<!DOCTYPE")
        ? "The reservation service is unavailable right now. Please refresh and try again."
        : "The reservation service returned an unexpected response."
    );
  }
}

if (reserveForm) {
  reserveForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = {
      name: form.elements.name.value.trim(),
      date: form.elements.date.value,
      guests: form.elements.guests.value,
    };

    if (!formData.name || !formData.date) {
      setMessage("Please complete your name and the reservation date.", "error");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    const originalLabel = submitButton?.innerHTML;

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = "Sending… <span>↗</span>";
    }

    try {
      const response = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const payload = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(payload.error || "Reservation could not be sent.");
      }

      setMessage(payload.message, "success");
      form.reset();
      if (dateInput) dateInput.min = getLocalToday();
    } catch (error) {
      setMessage(
        error.message || "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalLabel;
      }
    }
  });
}
