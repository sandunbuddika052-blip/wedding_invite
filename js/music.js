/**
 * Wedding Music & Ambient Sound Controller
 * Supports custom audio files with graceful Web Audio API romantic harp/chimes fallback
 */

class WeddingMusicController {
  constructor() {
    this.audioElement = null;
    this.isPlaying = false;
    this.audioContext = null;
    this.synthLoopTimeout = null;
    this.isMuted = false;
    this.toggleBtn = document.getElementById("musicToggleBtn");
    this.musicBars = document.querySelectorAll(".music-bar");
    this.useSynth = false;

    this.init();
  }

  init() {
    const config = window.WEDDING_CONFIG?.music;
    if (!config || !config.enabled) return;

    // Create background audio element
    this.audioElement = new Audio();
    this.audioElement.src = config.audioSrc || "assets/audio/romantic-bgm.mp3";
    this.audioElement.loop = true;
    this.audioElement.volume = 0.5;

    // Test if audio file is available
    this.audioElement.addEventListener("error", () => {
      // Audio file not present; use peaceful ambient Web Audio synthesizer
      this.useSynth = true;
    });

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.toggle());
    }
  }

  start() {
    if (this.isPlaying) return;

    if (!this.useSynth && this.audioElement && this.audioElement.src) {
      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            this.updateUI(true);
          })
          .catch(() => {
            // Autoplay policy or 404, fallback to Web Audio
            this.useSynth = true;
            this.startSynth();
          });
      }
    } else {
      this.startSynth();
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.synthLoopTimeout) {
      clearTimeout(this.synthLoopTimeout);
      this.synthLoopTimeout = null;
    }
    this.updateUI(false);
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.start();
    }
  }

  updateUI(playing) {
    if (!this.toggleBtn) return;
    if (playing) {
      this.toggleBtn.classList.add("playing");
      this.toggleBtn.setAttribute("title", "Pause Music");
      this.musicBars.forEach(b => b.classList.add("animated"));
    } else {
      this.toggleBtn.classList.remove("playing");
      this.toggleBtn.setAttribute("title", "Play Music");
      this.musicBars.forEach(b => b.classList.remove("animated"));
    }
  }

  /**
   * Romantic ambient music box synthesizer
   * Plays gentle, warm acoustic harp/piano tones (Canon / romantic chords)
   */
  startSynth() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) {
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }

      this.isPlaying = true;
      this.updateUI(true);

      // Romantic chord notes (Frequencies in Hz: D major romantic progression: D, F#, A, E, C#, B, G)
      const chords = [
        [293.66, 369.99, 440.00, 587.33], // D maj
        [220.00, 277.18, 329.63, 440.00], // A maj
        [246.94, 293.66, 369.99, 493.88], // B min
        [196.00, 246.94, 293.66, 392.00], // G maj
      ];

      let chordIndex = 0;
      let noteIndex = 0;

      const playNextTone = () => {
        if (!this.isPlaying) return;

        const currentChord = chords[chordIndex];
        const freq = currentChord[noteIndex % currentChord.length];

        this.playSoftBell(freq);

        noteIndex++;
        if (noteIndex >= currentChord.length * 2) {
          noteIndex = 0;
          chordIndex = (chordIndex + 1) % chords.length;
        }

        // Delay between gentle notes
        const delay = noteIndex % 2 === 0 ? 650 : 850;
        this.synthLoopTimeout = setTimeout(playNextTone, delay);
      };

      playNextTone();
    } catch (e) {
      console.warn("Audio synthesis not supported or blocked", e);
    }
  }

  playSoftBell(freq) {
    if (!this.audioContext || this.audioContext.state !== "running") return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Warm sine + slight harmonic tone
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    // Filter to soften the sound (warm analog tone)
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, now);

    // Envelope: quick gentle attack, lingering smooth decay
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 2.3);
  }
}

// Global instance
window.weddingMusic = null;
document.addEventListener("DOMContentLoaded", () => {
  window.weddingMusic = new WeddingMusicController();
});
