# Luxury Digital Wedding Invitation Website 💍
**Yashodya & Vihanga** | Monday, 14th December 2026 | Deandra Bolgoda, Sri Lanka

A luxury, modern, mobile-first wedding invitation website built with HTML5, CSS3, and JavaScript, designed to match the gold, marble, and botanical aesthetics of the couple's physical invitation card.

---

## ✨ Features Included

1. **Interactive 3D Envelope Opening Experience**:
   - Realistic envelope with embossed golden seal stamped with couple monogram (`Y & V`).
   - Personalized envelope tag displaying the guest's name.
   - Smooth 3D flap opening and card rise animation.
   - Gold sparkle petal burst upon opening.
   - Floating button to re-experience opening the envelope anytime.

2. **Personalized Guest Experience**:
   - Pass any guest's name via URL parameter:
     - `index.html?guest=Vihanga`
     - `index.html?guest=Mr.+and+Mrs.+Perera`
     - `index.html?to=Sunil+Uncle`
   - Dynamically personalizes:
     - The envelope calligraphy tag
     - The hero welcome badge
     - The RSVP form's name field

3. **Ambient Music & Sound Controller**:
   - Soft background romantic melody.
   - Audio controller with animated soundwave bars.
   - Built-in Web Audio API romantic acoustic harp/piano chord synthesizer fallback (works without external audio files, and also supports adding your own `assets/audio/romantic-bgm.mp3`).

4. **Live Wedding Countdown**:
   - Real-time countdown to Monday, 14th December 2026, 10:00 AM (SLST).
   - "Save to Calendar (.ics)" button for Apple Calendar, Outlook, and iPhone.
   - One-tap "Add to Google Calendar" link.

5. **Physical Invitation Card Showcase**:
   - High-resolution showcase of the original invitation card (`assets/images/invitation-card.jpg`).
   - Fullscreen zoom lightbox.
   - Download Invitation Card button for guests.

6. **Order of Events (Ceremony Timeline)**:
   - 10:00 AM - Welcome & Arrival of Guests
   - 10:50 AM - Auspicious Poruwa Ceremony
   - 11:45 AM - Champagne Toast & Cake Cutting
   - 12:30 PM - Wedding Lunch & Banquet
   - 02:00 PM - Music, Celebration & Photos
   - 03:30 PM - Going Away & Farewell

7. **Venue & Directions (Deandra Bolgoda)**:
   - Detailed venue information on Bolgoda Lake.
   - Embedded Google Map.
   - Direct "Get Directions on Google Maps" mobile link.
   - Dress code & parking details.

8. **Photo Gallery ("Captured Moments")**:
   - Romantic photo placeholders with hover captions and lightbox preview.
   - Easily customizable in `js/config.js`.

9. **RSVP with Direct WhatsApp Integration**:
   - Sri Lankan weddings rely heavily on WhatsApp for confirmations.
   - Instant WhatsApp RSVP buttons for Vihanga (`077 914 0659`) and Yashodya (`071 717 2900`).
   - Interactive form collecting attendance, guest count, dietary preferences, and wishes.
   - Pre-formats a WhatsApp message and prompts the guest to send it with one tap.
   - Optional PHP backend (`api/rsvp.php`) that logs submissions to `api/rsvps.json`.

10. **Blessings Wall (Interactive Guestbook)**:
    - Guests can leave heartfelt messages that display in real-time on the blessings wall.
    - Persisted locally using `localStorage` and sent to the couple.

---

## 🛠️ How to Customize (`js/config.js`)

All text, dates, names, phone numbers, and images are managed inside a single file: `js/config.js`.

```javascript
const WEDDING_CONFIG = {
  bride: {
    firstName: "Yashodya",
    fullName: "Yashodya Wickramaratne",
    parents: "Mr. and Mrs. Wickramaratne",
    phoneDisplay: "071 717 2900",
    whatsapp: "94717172900"
  },
  groom: {
    firstName: "Vihanga",
    fullName: "Vihanga Aluthge",
    parents: "Mr. and Mrs. Aluthge",
    phoneDisplay: "077 914 0659",
    whatsapp: "94779140659"
  },
  event: {
    dateISO: "2026-12-14T10:00:00+05:30",
    dateFormatted: "14th December 2026",
    startTime: "10:00 AM",
    poruwaTime: "10:50 AM",
    rsvpDeadline: "30th November 2026"
  },
  venue: {
    name: "Deandra Bolgoda",
    fullAddress: "Deandra Bolgoda, Bolgoda Lake, Sri Lanka"
  }
};
```

---

## 🚀 How to Run Locally with XAMPP

1. Ensure Apache is running in XAMPP.
2. Open your web browser and visit:
   - General invite: `http://localhost/Lakmini_wedding_invite/`
   - Personalized invite for Vihanga: `http://localhost/Lakmini_wedding_invite/?guest=Vihanga`
   - Personalized invite for family: `http://localhost/Lakmini_wedding_invite/?guest=Mr.+%26+Mrs.+Perera`

---

## 🌐 Deploying to the Web

You can easily host this website for free or on your own domain:
1. **GitHub Pages / Vercel / Netlify**: Simply upload this folder. It requires no server configuration.
2. **savethedate.lk or Custom Domain**: Upload all files to your web root (`public_html`).
