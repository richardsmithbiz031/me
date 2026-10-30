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
const reviewGrid = document.querySelector("#review-grid");
const reviewForm = document.querySelector("#review-form");
const reviewFormMessage = reviewForm?.querySelector(".review-form-message");
const ratingScoreEl = document.querySelector(".rating-score");
const ratingCopyEl = document.querySelector(".rating-copy");
const ratingStarsEl = document.querySelector(".rating-stars");
const defaultReviews = [
  {
    name: "Naomi T.",
    role: "Dinner guest",
    rating: 5,
    text: "The room feels special, the food is vibrant, and every plate carries personality. We stayed for dessert and ended up ordering a second round.",
  },
  {
    name: "Marcus L.",
    role: "Weekend date night",
    rating: 5,
    text: "Absolutely worth the wait. The flavour combinations are inventive, the service is warm, and the atmosphere is elegant without feeling stiff.",
  },
  {
    name: "Rina S.",
    role: "Local regular",
    rating: 5,
    text: "A beautifully layered menu with something for everyone. We came for cocktails and left talking about the jollof for days.",
  },
];
const REVIEW_STORAGE_KEY = "megatron-mouth-reviews";

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

function readStoredReviews() {
  try {
    const savedReviews = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || "null");
    return Array.isArray(savedReviews) && savedReviews.length > 0 ? savedReviews : defaultReviews;
  } catch (error) {
    return defaultReviews;
  }
}

function saveReviews(reviews) {
  try {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews));
  } catch (error) {
    // Ignore storage failures so the page still works without persistence.
  }
}

function updateRatingSummary(reviews) {
  if (!ratingScoreEl || !ratingCopyEl || !ratingStarsEl) return;

  const average = reviews.reduce((sum, review) => sum + Number(review.rating || 5), 0) / reviews.length;
  ratingScoreEl.textContent = average.toFixed(1);
  ratingCopyEl.textContent = `based on ${reviews.length} review${reviews.length === 1 ? "" : "s"}`;
  ratingStarsEl.textContent = "★".repeat(Math.round(average)) + "☆".repeat(5 - Math.round(average));
}

function renderReviews() {
  if (!reviewGrid) return;

  const reviews = readStoredReviews();
  reviewGrid.innerHTML = "";

  reviews.forEach((review) => {
    const card = document.createElement("article");
    card.className = "review-card";
    if (review.highlight) {
      card.classList.add("highlight");
    }

    const reviewText = review.text || "";
    const starMarkup = `${"★".repeat(Number(review.rating || 5))}${"☆".repeat(5 - Number(review.rating || 5))}`;

    card.innerHTML = `
      <div class="review-stars" aria-label="${review.rating} out of 5 stars">${starMarkup}</div>
      <p>“${reviewText}”</p>
      <div class="review-person">
        <strong>${review.name}</strong>
        <span>${review.role}</span>
      </div>
    `;

    reviewGrid.appendChild(card);
  });

  updateRatingSummary(reviews);
}

function setReviewMessage(text, tone = "neutral") {
  if (!reviewFormMessage) return;
  reviewFormMessage.textContent = text;
  reviewFormMessage.dataset.tone = tone;
}

function syncRatingStars(selectedValue = 5) {
  if (!reviewForm) return;

  const ratingInputs = reviewForm.querySelectorAll('input[name="reviewRating"]');
  ratingInputs.forEach((input) => {
    const starLabel = reviewForm.querySelector(`label[for="${input.id}"]`);
    if (!starLabel) return;
    starLabel.classList.toggle("active", Number(input.value) <= selectedValue);
  });
}

if (reviewForm) {
  const ratingInputs = reviewForm.querySelectorAll('input[name="reviewRating"]');

  ratingInputs.forEach((input) => {
    input.addEventListener("change", () => {
      syncRatingStars(Number(input.value));
    });
  });

  reviewForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const name = form.elements.reviewName.value.trim();
    const message = form.elements.reviewMessage.value.trim();
    const rating = Number(form.elements.reviewRating.value || 5);

    if (!name || !message) {
      setReviewMessage("Please add your name and a short review before submitting.", "error");
      return;
    }

    const reviews = readStoredReviews();
    reviews.unshift({
      name,
      role: "Guest review",
      rating,
      text: message,
    });

    saveReviews(reviews);
    renderReviews();
    form.reset();
    setReviewMessage("Thank you for sharing your feedback.", "success");
    syncRatingStars(5);
  });

  syncRatingStars(5);
}

renderReviews();

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
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      date: form.elements.date.value,
      time: form.elements.time.value,
      guests: form.elements.guests.value,
    };

    if (!formData.name || !formData.date || !formData.email || !formData.phone || !formData.time) {
      setMessage(
        "Please complete your name, email, phone number, time, and reservation date.",
        "error"
      );
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
