# 💍 Yomali & Harindu — Wedding Invitation Website

A luxury, mobile-first digital wedding invitation for **Yomali & Harindu**.  
Theme: **Blush Rose Gold × Ivory × Champagne** — warm, romantic, elegant.

---

## 🚀 Quick Start (XAMPP)

1. Start **Apache** in your XAMPP Control Panel.
2. Open your browser and go to:

| URL | What it shows |
|-----|---------------|
| `http://localhost/yomali_harindu_invite/` | Standard invite |
| `http://localhost/yomali_harindu_invite/?guest=Vihanga` | Personalised for "Vihanga" |
| `http://localhost/yomali_harindu_invite/?guest=Mr.+%26+Mrs.+Perera` | Personalised for a family |
| `http://localhost/yomali_harindu_invite/?skip=1` | Skip envelope (jump straight to the page) |

---

## ✏️ Filling in the Placeholders

**All content lives in one place:**  
👉 [`js/config.js`](js/config.js)

Search for `← FILL THIS IN` to find every placeholder. Here is a checklist:

### Couple Details
- [ ] `bride.fullName` — Yomali's full name
- [ ] `bride.parents` — "Mr. & Mrs. [Her Parents' Surname]"
- [ ] `bride.phone` / `bride.phoneDisplay` — her phone number
- [ ] `bride.whatsapp` — `94` + phone (no spaces, no `0` prefix) e.g. `94771234567`
- [ ] Same for `groom.*`

### Wedding Date & Time
- [ ] `event.dateISO` — e.g. `"2026-12-20T10:00:00+05:30"`
- [ ] `event.dayOfWeek` — e.g. `"Saturday"`
- [ ] `event.dateFormatted` — e.g. `"20th December 2026"`
- [ ] `event.startTime` — e.g. `"10:00 AM"`
- [ ] `event.poruwaTime` — e.g. `"10:50 AM"`
- [ ] `event.rsvpDeadline` — e.g. `"30th November 2026"`

### Venue
- [ ] `venue.name` — e.g. `"Waters Edge"`
- [ ] `venue.subName` — e.g. `"Battaramulla, Colombo"`
- [ ] `venue.fullAddress` — full address for map links
- [ ] `venue.googleMapsSearchUrl` — Google Maps search link
- [ ] `venue.googleMapsEmbedUrl` — paste the embed URL from Google Maps → Share → Embed a map

### Photos & Card Image
- [ ] Drop couple photos into `assets/images/` then update the `gallery` array in `config.js`
- [ ] Drop the physical invitation card as `assets/images/invitation-card.jpg`

### Background Music (optional)
- [ ] Drop an MP3 into `assets/audio/wedding-bgm.mp3`  
  If the file doesn't exist, a built-in romantic harp/chord synthesizer plays automatically.

---

## 🌟 Features

| Feature | Details |
|---------|---------|
| 🎁 **Envelope Opening** | 3D animated envelope sealed with a rose wax monogram `Y&H` |
| 👤 **Personalised Invites** | `?guest=Name` shows a personal greeting on the envelope + hero badge |
| 🎵 **Ambient Music** | Plays romantic chords (or your own MP3); animated soundwave bars |
| ⏱️ **Live Countdown** | Ticks to the exact ceremony time (SLST) |
| 📅 **Calendar Save** | One-click `.ics` download + Google Calendar link |
| 💌 **Physical Card Showcase** | Zooms to full-screen, downloadable by guests |
| 🗓️ **Order of Events** | Animated vertical timeline |
| 📍 **Venue & Map** | Embedded Google Map + directions link |
| 🖼️ **Photo Gallery** | Hover captions, lightbox zoom; shows placeholders until real photos added |
| ✅ **RSVP** | WhatsApp quick-confirm + full form → saves to `api/rsvps.json` |
| 💬 **Blessings Wall** | Live guestbook where visitors post and see wishes |
| 📱 **Fully Responsive** | Works perfectly on mobile, tablet, and desktop |

---

## 📁 Project Structure

```
yomali_harindu_invite/
├── index.html              ← Main page
├── css/
│   └── style.css           ← All styles (Blush Rose Gold theme)
├── js/
│   ├── config.js           ← ⭐ ALL CONTENT — edit this file
│   └── main.js             ← Application logic
├── assets/
│   ├── images/
│   │   └── invitation-card.jpg   ← ← REPLACE with real card
│   └── audio/
│       └── wedding-bgm.mp3       ← Optional background music
└── api/
    └── rsvp.php            ← PHP endpoint that logs RSVPs to rsvps.json
```

---

## 🌐 Deploying Live

1. Upload the entire `yomali_harindu_invite/` folder to your web host.
2. Point `savethedate.lk/yomali&harindu` to this folder.
3. Done — no database or server setup needed!
