/**
 * Interactive Envelope & Personalization Logic
 */

(function () {
  const overlay = document.getElementById("envelopeOverlay");
  const wrapper = document.getElementById("envelopeWrapper");
  const openBtn = document.getElementById("openEnvelopeBtn");
  const waxSeal = document.getElementById("waxSeal");
  const guestTag = document.getElementById("envelopeGuestName");
  const heroGuestBadge = document.getElementById("heroGuestBadge");
  const rsvpNameInput = document.getElementById("rsvpName");
  const reopenBtn = document.getElementById("reopenEnvelopeBtn");

  // Helper to extract URL query parameter
  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || urlParams.get(name.toLowerCase());
  }

  // Personalization detection: ?guest=..., ?to=..., ?name=...
  const guestParam = getQueryParam("guest") || getQueryParam("to") || getQueryParam("name");
  let guestName = guestParam ? decodeURIComponent(guestParam).trim() : "";

  // If no guest specified in URL, use elegant default
  if (!guestName) {
    guestName = "Honored Guest";
  }

  // Populate guest name across elements
  if (guestTag) guestTag.textContent = guestName;
  if (heroGuestBadge) {
    heroGuestBadge.innerHTML = `Warmly Welcoming <span class="highlight-guest">${guestName}</span>`;
  }
  if (rsvpNameInput && guestName !== "Honored Guest") {
    rsvpNameInput.value = guestName;
  }

  // Envelope opening trigger
  let isOpened = false;

  function openEnvelope() {
    if (isOpened) return;
    isOpened = true;

    // Trigger envelope 3D opening animation
    wrapper.classList.add("open");

    // Start background music controller
    if (window.weddingMusic) {
      window.weddingMusic.start();
    }

    // Trigger celebratory gold confetti/petals
    createPetalsBurst();

    // After animation finishes, fade out overlay
    setTimeout(() => {
      overlay.classList.add("hidden");
      document.body.classList.remove("envelope-locked");
    }, 1400);
  }

  // Event listeners
  if (wrapper) wrapper.addEventListener("click", openEnvelope);
  if (openBtn) openBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openEnvelope();
  });
  if (waxSeal) waxSeal.addEventListener("click", (e) => {
    e.stopPropagation();
    openEnvelope();
  });

  // Re-open envelope if user wants to experience it again
  if (reopenBtn) {
    reopenBtn.addEventListener("click", () => {
      isOpened = false;
      wrapper.classList.remove("open");
      overlay.classList.remove("hidden");
      document.body.classList.add("envelope-locked");
    });
  }

  // Simple floating gold particle burst
  function createPetalsBurst() {
    const burstCount = 25;
    for (let i = 0; i < burstCount; i++) {
      const petal = document.createElement("div");
      petal.className = "sparkle-petal";
      petal.style.left = `${50 + (Math.random() * 40 - 20)}vw`;
      petal.style.top = `${50 + (Math.random() * 30 - 15)}vh`;
      petal.style.animationDuration = `${1.5 + Math.random() * 1.5}s`;
      petal.style.transform = `scale(${0.6 + Math.random() * 0.8}) rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(petal);
      setTimeout(() => petal.remove(), 2500);
    }
  }

  // Check if envelope should be auto-skipped via ?skip=1
  if (getQueryParam("skip") === "1" || getQueryParam("skipEnvelope") === "1") {
    overlay.classList.add("hidden");
    document.body.classList.remove("envelope-locked");
  } else {
    document.body.classList.add("envelope-locked");
  }
})();
