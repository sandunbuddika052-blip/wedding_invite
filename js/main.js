/**
 * ═══════════════════════════════════════════════════════════════
 *   Wedding Invitation — Editorial Luxury Engine
 * ═══════════════════════════════════════════════════════════════
 *  Features:
 *   - Editorial Luxury Intro Screen (Tap to Open with Sparkle Burst)
 *   - Ambient Gold Particle Canvas Simulation
 *   - Transparent-to-Frosted Sticky Header
 *   - Mobile Navigation Drawer
 *   - Accurate Real-time Countdown Timer
 *   - Personalized Guest Name detection from URL (?guest=Name)
 *   - Google Calendar + Apple/Outlook .ICS Calendar generation
 *   - Interactive RSVP with Attendance Toggle & 1-Click WhatsApp
 *   - Blessings Wall with LocalStorage persistence
 *   - Full-Screen Lightbox Modal
 *   - Ambient Audio Player with Web Audio API Fallback & Visualizer
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  "use strict";

  const cfg = window.WEDDING_CONFIG || {};

  // Utility selector
  const $ = (id) => document.getElementById(id);

  /* ──────────────────────────────────────────────────────────
     0. INTRO SCREEN CONTROLLER & PARTICLE CANVAS
  ────────────────────────────────────────────────────────── */
  function setupIntroScreen() {
    try {
      const screen = $("introScreen");
      const enterBtn = $("enterBtn");
      const canvas = $("introCanvas");
      const introGuestName = $("introGuestName");

      // Populate guest name in intro
      const params = new URLSearchParams(window.location.search);
      const rawName = params.get("guest") || params.get("to") || params.get("name") || "";
      const guestName = rawName.trim();
      if (guestName && introGuestName) {
        introGuestName.textContent = guestName;
      }

      if (!screen || !enterBtn) return;

      // Particle Canvas
      let particles = [];
      let animId = null;
      let ctx = null;

      if (canvas) {
        ctx = canvas.getContext("2d");
        function resize() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }
        window.addEventListener("resize", resize);
        resize();

        // Generate warm gold and copper particles
        for (let i = 0; i < 48; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2.2 + 0.8,
            vx: (Math.random() - 0.5) * 0.4,
            vy: -Math.random() * 0.5 - 0.2,
            alpha: Math.random() * 0.6 + 0.2,
            gold: Math.random() > 0.4 ? "rgba(163, 82, 50," : "rgba(205, 145, 90,"
          });
        }

        function loop() {
          if (!ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          for (let p of particles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `${p.gold}${p.alpha})`;
            ctx.fill();
          }
          animId = requestAnimationFrame(loop);
        }
        loop();
      }

      // Sparkle burst when opening
      function triggerSparkleBurst(x, y) {
        if (!ctx || !canvas) return;
        const burstParticles = [];
        for (let i = 0; i < 35; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          burstParticles.push({
            x: x || canvas.width / 2,
            y: y || canvas.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            r: Math.random() * 3 + 1,
            alpha: 1,
            color: Math.random() > 0.5 ? "rgba(163,82,50," : "rgba(218,165,32,"
          });
        }

        function animateBurst() {
          if (!burstParticles.length) return;
          for (let i = burstParticles.length - 1; i >= 0; i--) {
            const b = burstParticles[i];
            b.x += b.vx;
            b.y += b.vy;
            b.alpha -= 0.025;
            if (b.alpha <= 0) {
              burstParticles.splice(i, 1);
              continue;
            }
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fillStyle = `${b.color}${b.alpha})`;
            ctx.fill();
          }
          if (burstParticles.length) requestAnimationFrame(animateBurst);
        }
        animateBurst();
      }

      let opened = false;
      function openInvitation(e) {
        if (opened) return;
        opened = true;

        const rect = enterBtn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        triggerSparkleBurst(centerX, centerY);

        // Start background music automatically
        if (window.startMusic) {
          window.startMusic();
        }

        // Smooth exit
        screen.classList.add("exit");
        document.body.classList.remove("locked");

        setTimeout(() => {
          if (animId) cancelAnimationFrame(animId);
        }, 1200);
      }

      enterBtn.addEventListener("click", openInvitation);
      screen.addEventListener("click", (e) => {
        // If clicked outside button, also allow opening
        if (e.target === screen || e.target === canvas) {
          openInvitation(e);
        }
      });
    } catch (e) {
      console.warn("Intro screen:", e);
      document.body.classList.remove("locked");
    }
  }

  /* ──────────────────────────────────────────────────────────
     1. GUEST PERSONALIZATION
  ────────────────────────────────────────────────────────── */
  function setupGuestGreeting() {
    try {
      const params = new URLSearchParams(window.location.search);
      const rawName = params.get("guest") || params.get("to") || params.get("name") || "";
      const guestName = rawName.trim();

      const pillEl = $("guestWelcomePill");
      const nameEl = $("guestWelcomeName");
      const rsvpInput = $("rsvpName");

      if (guestName) {
        if (nameEl) nameEl.textContent = guestName;
        if (rsvpInput) rsvpInput.value = guestName;
      } else {
        if (nameEl) nameEl.textContent = "Dear Guest";
      }
    } catch (e) {
      console.warn("Guest personalization:", e);
    }
  }

  /* ──────────────────────────────────────────────────────────
     2. STICKY HEADER & MOBILE NAV
  ────────────────────────────────────────────────────────── */
  function setupHeaderAndNav() {
    try {
      const header = $("siteHeader");
      const menuBtn = $("menuToggleBtn");
      const closeBtn = $("mobileNavClose");
      const overlay = $("mobileNavOverlay");
      const navLinks = document.querySelectorAll(".mobile-nav-item, .nav-link");

      // Scroll effect
      function handleScroll() {
        if (window.scrollY > 40) {
          header.classList.add("scrolled");
        } else {
          header.classList.remove("scrolled");
        }
      }

      window.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();

      // Mobile Menu
      if (menuBtn && overlay) {
        menuBtn.addEventListener("click", () => {
          overlay.classList.add("open");
          document.body.style.overflow = "hidden";
        });
      }

      function closeMenu() {
        if (overlay) {
          overlay.classList.remove("open");
          document.body.style.overflow = "";
        }
      }

      if (closeBtn) closeBtn.addEventListener("click", closeMenu);

      navLinks.forEach((link) => {
        link.addEventListener("click", () => {
          closeMenu();
        });
      });
    } catch (e) {
      console.warn("Header/Nav setup:", e);
    }
  }

  /* ──────────────────────────────────────────────────────────
     3. COUNTDOWN TIMER
  ────────────────────────────────────────────────────────── */
  function setupCountdown() {
    try {
      const daysEl = $("cdDays");
      const hoursEl = $("cdHours");
      const minsEl = $("cdMinutes");
      const secsEl = $("cdSeconds");

      if (!daysEl) return;

      // Target: 14th December 2026, 10:00 AM Sri Lanka Time (UTC+05:30)
      const targetTime = new Date("2026-12-14T10:00:00+05:30").getTime();

      function updateTimer() {
        const now = Date.now();
        const diff = targetTime - now;

        if (diff <= 0) {
          daysEl.textContent = "00";
          hoursEl.textContent = "00";
          minsEl.textContent = "00";
          secsEl.textContent = "00";
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        daysEl.textContent = String(days).padStart(2, "0");
        hoursEl.textContent = String(hours).padStart(2, "0");
        minsEl.textContent = String(minutes).padStart(2, "0");
        secsEl.textContent = String(seconds).padStart(2, "0");
      }

      updateTimer();
      setInterval(updateTimer, 1000);
    } catch (e) {
      console.warn("Countdown:", e);
    }
  }

  /* ──────────────────────────────────────────────────────────
     4. CALENDAR INTEGRATION (.ICS GENERATOR)
  ────────────────────────────────────────────────────────── */
  function setupCalendarDownload() {
    try {
      const btn = $("downloadIcsBtn");
      if (!btn) return;

      btn.addEventListener("click", () => {
        const title = "Wedding of Yashodya & Vihanga";
        const desc = "We warmly invite you to celebrate the wedding of Yashodya & Vihanga at Deandra Bolgoda. Auspicious Poruwa Ceremony at 10:50 AM.";
        const loc = "Deandra Bolgoda, Bolgoda Lake, Sri Lanka";
        const start = "20261214T043000Z"; // 10:00 AM UTC+5:30 in UTC
        const end = "20261214T110000Z";   // 4:30 PM UTC+5:30 in UTC

        const icsData = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//Yashodya and Vihanga Wedding//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
          "BEGIN:VEVENT",
          `SUMMARY:${title}`,
          `DESCRIPTION:${desc}`,
          `LOCATION:${loc}`,
          `DTSTART:${start}`,
          `DTEND:${end}`,
          "STATUS:CONFIRMED",
          "END:VEVENT",
          "END:VCALENDAR"
        ].join("\r\n");

        const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Yashodya_and_Vihanga_Wedding.ics";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("Calendar event downloaded");
      });
    } catch (e) {
      console.warn("Calendar ICS:", e);
    }
  }

  /* ──────────────────────────────────────────────────────────
     5. RSVP INTERACTION & WHATSAPP GENERATOR
  ────────────────────────────────────────────────────────── */
  function setupRSVP() {
    try {
      const form = $("rsvpForm");
      const nameInput = $("rsvpName");
      const guestsSelect = $("rsvpGuests");
      const noteInput = $("rsvpNote");
      const btnYes = $("btnAttendYes");
      const btnNo = $("btnAttendNo");
      const countGroup = $("guestsCountGroup");
      const waVihanga = $("whatsappVihangaBtn");
      const waYashodya = $("whatsappYashodyaBtn");

      let attendanceStatus = "attending"; // "attending" | "declining"

      if (btnYes && btnNo) {
        btnYes.addEventListener("click", () => {
          attendanceStatus = "attending";
          btnYes.classList.add("active");
          btnNo.classList.remove("active");
          if (countGroup) countGroup.style.display = "block";
          updateWhatsAppLinks();
        });

        btnNo.addEventListener("click", () => {
          attendanceStatus = "declining";
          btnNo.classList.add("active");
          btnYes.classList.remove("active");
          if (countGroup) countGroup.style.display = "none";
          updateWhatsAppLinks();
        });
      }

      function buildWhatsAppMessage() {
        const name = (nameInput && nameInput.value.trim()) || "Guest";
        const guests = (guestsSelect && guestsSelect.value) || "1";
        const note = (noteInput && noteInput.value.trim()) || "";

        let msg = "";
        if (attendanceStatus === "attending") {
          msg = `*Wedding RSVP — Yashodya & Vihanga*\n\n` +
                `Hello! I am delighted to confirm my attendance.\n\n` +
                `• *Guest Name:* ${name}\n` +
                `• *Attending:* Joyfully Accepts (Yes)\n` +
                `• *Number of Guests:* ${guests}\n`;
        } else {
          msg = `*Wedding RSVP — Yashodya & Vihanga*\n\n` +
                `Hello! Regretfully I will not be able to attend, but sending my warmest congratulations & blessings!\n\n` +
                `• *Guest Name:* ${name}\n` +
                `• *Attending:* Regretfully Declines\n`;
        }

        if (note) {
          msg += `• *Wishes / Note:* "${note}"\n`;
        }

        return encodeURIComponent(msg);
      }

      function updateWhatsAppLinks() {
        const text = buildWhatsAppMessage();
        if (waVihanga) {
          waVihanga.href = `https://wa.me/94779140659?text=${text}`;
        }
        if (waYashodya) {
          waYashodya.href = `https://wa.me/94717172900?text=${text}`;
        }
      }

      if (nameInput) nameInput.addEventListener("input", updateWhatsAppLinks);
      if (guestsSelect) guestsSelect.addEventListener("change", updateWhatsAppLinks);
      if (noteInput) noteInput.addEventListener("input", updateWhatsAppLinks);

      updateWhatsAppLinks();

      // Form submission
      if (form) {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const name = (nameInput && nameInput.value.trim()) || "";

          if (!name) {
            showToast("Please enter your name");
            nameInput.focus();
            return;
          }

          const note = (noteInput && noteInput.value.trim()) || "";
          if (note) {
            saveBlessing(name, note);
          }

          updateWhatsAppLinks();

          // Offer WhatsApp direct send
          showToast("RSVP Recorded! Opening WhatsApp...");
          setTimeout(() => {
            if (waVihanga && waVihanga.href) {
              window.open(waVihanga.href, "_blank");
            }
          }, 800);
        });
      }
    } catch (e) {
      console.warn("RSVP setup:", e);
    }
  }

  /* ──────────────────────────────────────────────────────────
     6. BLESSINGS WALL (GUESTBOOK)
  ────────────────────────────────────────────────────────── */
  const DEFAULT_BLESSINGS = [
    {
      name: "Kasun & Chamari",
      text: "Wishing you both a lifetime of unending love, joy, and blessed moments on this beautiful new journey together!"
    },
    {
      name: "Uncle Nihal & Family",
      text: "Congratulations to our dear Yashodya and Vihanga! May your marriage be filled with harmony, prosperity, and joy."
    },
    {
      name: "Dinuka & Friends",
      text: "So excited to celebrate your big day at Bolgoda Lake! You two make the most wonderful couple. Cheers to forever!"
    }
  ];

  function getStoredBlessings() {
    try {
      const stored = localStorage.getItem("wedding_blessings_yv");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return DEFAULT_BLESSINGS;
  }

  function renderBlessings() {
    try {
      const grid = $("blessingsGrid");
      if (!grid) return;

      const list = getStoredBlessings();
      grid.innerHTML = list.map((b) => `
        <div class="blessing-card">
          <p class="blessing-card-text">&ldquo;${escapeHtml(b.text)}&rdquo;</p>
          <p class="blessing-card-author">&mdash; ${escapeHtml(b.name)}</p>
        </div>
      `).join("");
    } catch (e) {
      console.warn("Render blessings:", e);
    }
  }

  function saveBlessing(name, text) {
    try {
      const list = getStoredBlessings();
      list.unshift({ name, text });
      localStorage.setItem("wedding_blessings_yv", JSON.stringify(list));
      renderBlessings();
    } catch (e) {
      console.warn("Save blessing:", e);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ──────────────────────────────────────────────────────────
     7. LIGHTBOX MODAL
  ────────────────────────────────────────────────────────── */
  window.openLightbox = function (src) {
    const modal = $("lightboxModal");
    const img = $("lightboxImg");
    if (modal && img) {
      img.src = src;
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  };

  window.closeLightbox = function () {
    const modal = $("lightboxModal");
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.closeLightbox();
    }
  });

  /* ──────────────────────────────────────────────────────────
     8. TOAST NOTIFICATION
  ────────────────────────────────────────────────────────── */
  function showToast(msg) {
    const toast = $("toastNotice");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  /* ──────────────────────────────────────────────────────────
     9. AMBIENT MUSIC (Audio Element + Web Audio Fallback)
  ────────────────────────────────────────────────────────── */
  function setupAudio() {
    try {
      const toggleBtn = $("musicToggleBtn");
      const label = $("musicBtnLabel");
      if (!toggleBtn) return;

      let isPlaying = false;
      let audio = null;
      let synthCtx = null;
      let synthInterval = null;

      // Try loading audio if available
      audio = new Audio("assets/audio/wedding-bgm.mp3");
      audio.loop = true;
      audio.preload = "none";

      function playGentleArpeggio() {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          if (!synthCtx) synthCtx = new AudioContext();
          if (synthCtx.state === "suspended") synthCtx.resume();

          // Gentle acoustic chord arpeggio: C, G, Am, F notes
          const notes = [261.63, 329.63, 392.00, 523.25, 440.00, 349.23, 392.00, 329.63];
          let idx = 0;

          function playNextNote() {
            if (!isPlaying) return;
            const osc = synthCtx.createOscillator();
            const gain = synthCtx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(notes[idx % notes.length], synthCtx.currentTime);

            gain.gain.setValueAtTime(0.001, synthCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.04, synthCtx.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, synthCtx.currentTime + 1.2);

            osc.connect(gain);
            gain.connect(synthCtx.destination);

            osc.start();
            osc.stop(synthCtx.currentTime + 1.25);

            idx++;
          }

          playNextNote();
          synthInterval = setInterval(playNextNote, 600);
        } catch (e) {
          console.warn("Synth fallback:", e);
        }
      }

      function stopGentleArpeggio() {
        if (synthInterval) clearInterval(synthInterval);
      }

      window.startMusic = function () {
        if (isPlaying) return;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            isPlaying = true;
            toggleBtn.classList.add("playing");
            if (label) label.textContent = "Music: On";
          }).catch(() => {
            isPlaying = true;
            playGentleArpeggio();
            toggleBtn.classList.add("playing");
            if (label) label.textContent = "Music: On";
          });
        } else {
          isPlaying = true;
          playGentleArpeggio();
          toggleBtn.classList.add("playing");
          if (label) label.textContent = "Music: On";
        }
      };

      toggleBtn.addEventListener("click", () => {
        if (!isPlaying) {
          window.startMusic();
        } else {
          isPlaying = false;
          audio.pause();
          stopGentleArpeggio();
          toggleBtn.classList.remove("playing");
          if (label) label.textContent = "Music: Off";
        }
      });
    } catch (e) {
      console.warn("Audio setup:", e);
    }
  }

  /* ──────────────────────────────────────────────────────────
     10. INITIALIZATION
  ────────────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    setupIntroScreen();
    setupGuestGreeting();
    setupHeaderAndNav();
    setupCountdown();
    setupCalendarDownload();
    setupRSVP();
    renderBlessings();
    setupAudio();
  });

})();
