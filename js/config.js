/**
 * ═══════════════════════════════════════════════════════════════
 *   Wedding Invitation — Central Configuration File
 * ═══════════════════════════════════════════════════════════════
 *  Populated with the exact real details from the invitation card!
 *  You can edit any text, time, or phone number anytime in this file.
 * ═══════════════════════════════════════════════════════════════
 */

const WEDDING_CONFIG = {

  /* ───── 💑 COUPLE ───── */
  bride: {
    firstName:    "Yashodya",
    fullName:     "Yashodya Wickramaratne",
    parents:      "Mr. and Mrs. Wickramaratne",
    phone:        "0717172900",
    phoneDisplay: "071 717 2900",
    whatsapp:     "94717172900",
    instagram:    "",
    bio:          "The bride who brings grace, warmth, and endless joy to every moment."
  },

  groom: {
    firstName:    "Vihanga",
    fullName:     "Vihanga Aluthge",
    parents:      "Mr. and Mrs. Aluthge",
    phone:        "0779140659",
    phoneDisplay: "077 914 0659",
    whatsapp:     "94779140659",
    instagram:    "",
    bio:          "The groom who found his forever home in her smile."
  },

  /* ───── 📅 EVENT ───── */
  event: {
    dateISO:          "2026-12-14T10:00:00+05:30",
    dayOfWeek:        "Monday",
    dateFormatted:    "14th December 2026",
    startTime:        "10:00 AM",
    poruwaTime:       "10:40 AM",
    rsvpDeadline:     "30th November 2026",
    calendarSummary:  "Wedding of Yashodya & Vihanga",
    calendarDescription: "We warmly invite you to celebrate the wedding of Yashodya & Vihanga at Deandra Bolgoda. Poruwa ceremony at 10:40 AM.",
  },

  /* ───── 📍 VENUE ───── */
  venue: {
    name:               "Deandra Bolgoda",
    subName:            "Piliyandala, Sri Lanka",
    fullAddress:        "Deandra Hotel Bolgoda, Piliyandala, Sri Lanka",
    googleMapsSearchUrl:"https://maps.app.goo.gl/Rv6A9ut9ppDGchgs6",
    googleMapsEmbedUrl: "https://maps.google.com/maps?q=6.8080444,79.9072937&t=&z=16&ie=UTF8&iwloc=&output=embed",
    dressCode:          "Western Formal or Traditional Sri Lankan in Your Most Elegant Attire",
    parkingInfo:        "Ample on-site parking available with valet assistance."
  },

  /* ───── 🗓️ ORDER OF EVENTS ───── */
  schedule: [
    {
      time:  "10:00 AM",
      title: "Welcome & Guest Arrival",
      desc:  "Gathering of family and friends with welcome refreshments at Deandra Hotel Bolgoda.",
      icon:  "fa-glass-cheers"
    },
    {
      time:  "10:40 AM",
      title: "Traditional Poruwa Ceremony",
      desc:  "The sacred traditional Sri Lankan rituals and tying of the wedding knot at the auspicious time.",
      icon:  "fa-ring"
    },
    {
      time:  "11:45 AM",
      title: "Champagne Toast & Cake Cutting",
      desc:  "Celebratory toast, lighting of the traditional brass oil lamp, and cake cutting.",
      icon:  "fa-cake-candles"
    },
    {
      time:  "12:30 PM",
      title: "Bar Opening",
      desc:  "The bar opens with drinks to toast the newlyweds and celebrate with family and friends.",
      icon:  "fa-martini-glass"
    },
    {
      time:  "12:45 PM",
      title: "Wedding Lunch & Banquet",
      desc:  "A delectable feast and joyous celebration with live music.",
      icon:  "fa-utensils"
    },
    {
      time:  "02:00 PM",
      title: "Music, Celebration & Photos",
      desc:  "Music, dancing, laughter, and family photographs.",
      icon:  "fa-camera"
    },
    {
      time:  "03:30 PM",
      title: "Going Away & Farewell",
      desc:  "Warm blessings as the newly wedded couple embarks on their forever journey.",
      icon:  "fa-car-side"
    }
  ],

  /* ───── 🖼️ GALLERY ───── */
  gallery: [
    { url: "assets/images/shoot/web/gallery-01.jpg", full: "assets/images/shoot/display/gallery-01.jpg", category: "midnight" },
    { url: "assets/images/shoot/web/gallery-02.jpg", full: "assets/images/shoot/display/gallery-02.jpg", category: "sunlit" },
    { url: "assets/images/shoot/web/gallery-03.jpg", full: "assets/images/shoot/display/gallery-03.jpg", category: "midnight" },
    { url: "assets/images/shoot/web/gallery-04.jpg", full: "assets/images/shoot/display/gallery-04.jpg", category: "sunlit" },
    { url: "assets/images/shoot/web/gallery-05.jpg", full: "assets/images/shoot/display/gallery-05.jpg", category: "midnight" },
    { url: "assets/images/shoot/web/gallery-06.jpg", full: "assets/images/shoot/display/gallery-06.jpg", category: "sunlit" },
    { url: "assets/images/shoot/web/gallery-07.jpg", full: "assets/images/shoot/display/gallery-07.jpg", category: "midnight" },
    { url: "assets/images/shoot/web/gallery-08.jpg", full: "assets/images/shoot/display/gallery-08.jpg", category: "sunlit" },
    { url: "assets/images/shoot/web/gallery-09.jpg", full: "assets/images/shoot/display/gallery-09.jpg", category: "midnight" },
    { url: "assets/images/shoot/web/gallery-10.jpg", full: "assets/images/shoot/display/gallery-10.jpg", category: "sunlit" },
    { url: "assets/images/shoot/web/gallery-11.jpg", full: "assets/images/shoot/display/gallery-11.jpg", category: "midnight" },
    { url: "assets/images/shoot/web/gallery-12.jpg", full: "assets/images/shoot/display/gallery-12.jpg", category: "sunlit" },
    { url: "assets/images/shoot/web/gallery-13.jpg", full: "assets/images/shoot/display/gallery-13.jpg", category: "midnight" },
    { url: "assets/images/shoot/web/gallery-14.jpg", full: "assets/images/shoot/display/gallery-14.jpg", category: "sunlit" },
    { url: "assets/images/shoot/web/gallery-15.jpg", full: "assets/images/shoot/display/gallery-15.jpg", category: "midnight" },
    { url: "assets/images/shoot/web/gallery-16.jpg", full: "assets/images/shoot/display/gallery-16.jpg", category: "midnight" },
    { url: "assets/images/shoot/web/gallery-17.jpg", full: "assets/images/shoot/display/gallery-17.jpg", category: "midnight" }
  ],

  /* ───── 💌 INVITATION CARD ───── */
  invitationCardImage: "assets/images/invitation-card.jpg",

  /* ───── 🎵 BACKGROUND MUSIC ───── */
  music: {
    enabled:          true,
    audioSrc:         "assets/audio/wedding-bgm.m4a",
    trackTitle:       "Romantic Wedding Melody"
  },

  /* ───── ✨ WEDDING CREW & ARTISANS ───── */
  vendors: {
    band: {
      role: "Live Music & Entertainment",
      name: "Believer SL"
    },
    photographer: {
      role: "Photography & Cinematography",
      name: "Lovestruck Episodes"
    },
    bridalDressing: {
      role: "Bridal Dressing",
      name: "Salon Thish Bridal & Beauty",
      desc: "Creating radiant bridal glow, elegant drapes & timeless beauty for our special day."
    },
    groomSalon: {
      role: "Groom's Salon",
      name: "Mirror Salon",
      desc: "Sharp, polished grooming so the groom looks his very best on our special day."
    },
    groomOutfit: {
      role: "Groom's Designer Attire",
      name: "A Wed Design by Ashok Duminda"
    },
    jewellery: {
      role: "Bridal & Wedding Gold Jewellery",
      name: "New Kala, Hettiweediya"
    },
    cake: {
      role: "Wedding Cake",
      name: "Lanka Chandani Cake Creations",
      desc: "Handcrafted wedding cake structures & sweet delights for our celebration."
    }
  },

  /* ───── 🔗 WEBSITE / SOCIAL ───── */
  website: {
    url:      "savethedate.lk/yashodya&vihanga",
    hashtag:  "#YashodyaAndVihanga2026"
  }

};

// Make config globally available
window.WEDDING_CONFIG = WEDDING_CONFIG;
