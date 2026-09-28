// Web Audio API Ringtone & Browser Push Notification Manager for Papido
import { apiRequest } from '../api';

let audioCtx = null;
let masterGainNode = null;
let activeOscillators = [];
let ringInterval = null;
let ringTimeout = null;
let isRinging = false;
let fallbackAudio = null;

// Sound mute state with localStorage persistence (defaults to sound ON)
let soundMuted = false;
try {
  const saved = localStorage.getItem('papido_sound_enabled');
  if (saved !== null) {
    soundMuted = saved === 'false';
  }
} catch (_) {}

const muteListeners = new Set();
const ringtoneListeners = new Set();

function notifyMuteListeners() {
  muteListeners.forEach((fn) => {
    try { fn(!soundMuted); } catch (_) {}
  });
}

function notifyRingtoneListeners() {
  ringtoneListeners.forEach((fn) => {
    try { fn(isRinging); } catch (_) {}
  });
}

/**
 * Lazily initialize and return the Web Audio Context with a master gain node.
 */
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        audioCtx = new AudioContextClass();
        masterGainNode = audioCtx.createGain();
        masterGainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
        masterGainNode.connect(audioCtx.destination);
      } catch (_) {}
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Mobile & Desktop user-gesture audio unlocker.
 * Warms up hardware by resuming the AudioContext and playing a 1-sample silent buffer.
 */
function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    }
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown', 'mousedown'];
  const handleInteraction = () => {
    unlockAudio();
  };
  unlockEvents.forEach(evt => {
    window.addEventListener(evt, handleInteraction, { passive: true });
  });
}

/**
 * Generate a pre-rendered high-urgency dispatcher chime as a Data URI for fallback.
 * Dual-tone 880Hz + 1318.5Hz synthesized wave.
 */
function createWavDataUri() {
  try {
    const sampleRate = 22050;
    const duration = 0.5;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let s = 0;
      if (t < 0.2) {
        const env = Math.exp(-t * 11);
        s += (Math.sin(2 * Math.PI * 880 * t) * 0.7 + Math.sin(2 * Math.PI * 1760 * t) * 0.25) * env;
      }
      if (t >= 0.12) {
        const t2 = t - 0.12;
        const env2 = Math.exp(-t2 * 8.5);
        s += (Math.sin(2 * Math.PI * 1318.5 * t2) * 0.8 + Math.sin(2 * Math.PI * 2637 * t2) * 0.3) * env2;
      }
      s = Math.max(-1, Math.min(1, s));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return 'data:audio/wav;base64,' + window.btoa(binary);
  } catch (_) {
    return null;
  }
}

let cachedWavUri = null;

function getFallbackAudio() {
  if (typeof window === 'undefined') return null;
  if (!fallbackAudio) {
    if (!cachedWavUri) cachedWavUri = createWavDataUri();
    if (cachedWavUri) {
      fallbackAudio = new Audio(cachedWavUri);
      fallbackAudio.volume = 1.0;
    }
  }
  return fallbackAudio;
}

/**
 * Synthesizes a clean, high-urgency 3-note dispatcher chime using Web Audio API.
 * Falls back to HTML5 Audio ONLY if Web Audio is suspended or unavailable.
 */
function playAlertChime() {
  if (soundMuted) return;

  const ctx = getAudioContext();
  let playedWebAudio = false;

  if (ctx && ctx.state === 'running') {
    try {
      const now = ctx.currentTime;

      // Master gain envelope for this chime
      if (!masterGainNode) {
        masterGainNode = ctx.createGain();
        masterGainNode.connect(ctx.destination);
      }
      masterGainNode.gain.cancelScheduledValues(now);
      masterGainNode.gain.setValueAtTime(0.9, now);

      // Clean up previous oscillators if any are dangling
      activeOscillators.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch (_) {}
      });
      activeOscillators = [];

      // Tone 1: 880 Hz (A5 - Clear Bell Chime)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.85, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(masterGainNode);
      osc1.start(now);
      osc1.stop(now + 0.25);
      activeOscillators.push(osc1);

      // Tone 2: 1318.5 Hz (E6 - Bright Accent)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.5, now + 0.12);
      gain2.gain.setValueAtTime(0.001, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.9, now + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(masterGainNode);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
      activeOscillators.push(osc2);

      // Tone 3: 1760 Hz (A6 - Crisp High Ping)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1760, now + 0.24);
      gain3.gain.setValueAtTime(0.001, now + 0.24);
      gain3.gain.linearRampToValueAtTime(0.8, now + 0.25);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc3.connect(gain3);
      gain3.connect(masterGainNode);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.6);
      activeOscillators.push(osc3);

      playedWebAudio = true;
    } catch (_) {
      playedWebAudio = false;
    }
  }

  // Fall back to HTML5 Audio if Web Audio API was blocked or inactive
  if (!playedWebAudio) {
    try {
      const audio = getFallbackAudio();
      if (audio) {
        audio.currentTime = 0;
        const p = audio.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
      }
    } catch (_) {}
  }
}

function stopAllActiveSounds() {
  if (audioCtx && masterGainNode) {
    try {
      const now = audioCtx.currentTime;
      masterGainNode.gain.cancelScheduledValues(now);
      masterGainNode.gain.setValueAtTime(0.001, now);
    } catch (_) {}
  }
  activeOscillators.forEach(osc => {
    try { osc.stop(); osc.disconnect(); } catch (_) {}
  });
  activeOscillators = [];

  if (fallbackAudio) {
    try {
      fallbackAudio.pause();
      fallbackAudio.currentTime = 0;
    } catch (_) {}
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const alertManager = {
  // Check if sound is currently muted
  isMuted() {
    return soundMuted;
  },

  // Check if sound is currently enabled
  isSoundEnabled() {
    return !soundMuted;
  },

  // Set sound enabled or muted
  setSoundEnabled(enabled) {
    soundMuted = !enabled;
    try {
      localStorage.setItem('papido_sound_enabled', String(enabled));
    } catch (_) {}

    if (soundMuted) {
      this.stopRingtone();
    } else {
      unlockAudio();
      playAlertChime();
    }
    notifyMuteListeners();
  },

  setMuted(muted) {
    this.setSoundEnabled(!muted);
  },

  toggleMute() {
    const newState = soundMuted; // Will flip
    this.setSoundEnabled(newState);
    return !soundMuted;
  },

  // Subscribe to sound setting changes
  onMuteChange(listener) {
    if (typeof listener === 'function') {
      muteListeners.add(listener);
      return () => muteListeners.delete(listener);
    }
    return () => {};
  },

  // Force unlock audio context on mobile & desktop
  unlock() {
    unlockAudio();
  },

  // Request browser push notification permission and unlock AudioContext
  async requestPermission(token = null) {
    if (typeof window !== 'undefined') {
      unlockAudio();
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (_) {}
      }
      if (token) {
        this.subscribeToPushNotifications(token);
      }
    }
  },

  // Subscribes browser Service Worker to background Push Notifications
  async subscribeToPushNotifications(token) {
    try {
      unlockAudio();

      if (typeof window === 'undefined' || !('Notification' in window)) {
        return { success: false, reason: 'NOT_SUPPORTED', message: 'Notifications are not supported by this browser.' };
      }

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'denied') {
        return {
          success: false,
          reason: 'DENIED',
          message: 'Notifications are blocked in your browser settings. To enable:\n1. Click the Lock icon next to the website URL at the top\n2. Set Notifications to "Allow"\n3. Reload the page.'
        };
      }

      if (permission !== 'granted') {
        return { success: false, reason: 'NOT_GRANTED', message: 'Notification permission was not granted.' };
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return { success: true, reason: 'IN_APP_ONLY', message: 'Audio and in-app notifications enabled.' };
      }

      // Ensure service worker is registered
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
      }
      await navigator.serviceWorker.ready;

      let vapidPublicKey = 'BGFugS6k-KrKIMVzt5Y6_vXVg-x84AhVBPexrqFMSYq8L2LMUyb6l6yA_dafnffFqvOIT9esp5T3VpfIEPtD00M';
      try {
        const keyRes = await apiRequest('/push/vapid-public-key');
        if (keyRes?.data?.publicKey) {
          vapidPublicKey = keyRes.data.publicKey;
        }
      } catch (_) {}

      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      }

      if (token && sub) {
        await apiRequest('/push/subscribe', 'POST', { subscription: sub }, token);
        console.log('[PWA] Background push subscription synced with backend.');
      }

      return { success: true, reason: 'GRANTED', message: 'Lock-screen notifications are now ACTIVE! You will receive ride alerts even when this browser is closed.' };
    } catch (err) {
      console.warn('[PWA Push Error]', err);
      return { success: false, reason: 'ERROR', message: err.message || 'Failed to initialize push subscription.' };
    }
  },

  // Start continuous repeating ringtone with auto-stop safety timeout (default 45s)
  startRingtone(repeatIntervalMs = 2200, maxDurationSec = 45) {
    if (soundMuted) return;
    if (isRinging) return;
    isRinging = true;
    notifyRingtoneListeners();

    unlockAudio();
    playAlertChime();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([300, 150, 300, 150, 300]); } catch (_) {}
    }

    if (ringInterval) clearInterval(ringInterval);
    ringInterval = setInterval(() => {
      if (soundMuted) {
        this.stopRingtone();
        return;
      }
      playAlertChime();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([300, 150, 300]); } catch (_) {}
      }
    }, repeatIntervalMs);

    // Auto-stop safety timeout
    if (ringTimeout) clearTimeout(ringTimeout);
    ringTimeout = setTimeout(() => {
      this.stopRingtone();
    }, maxDurationSec * 1000);
  },

  // Stop continuous ringtone immediately
  stopRingtone() {
    const wasRinging = isRinging;
    if (ringInterval) {
      clearInterval(ringInterval);
      ringInterval = null;
    }
    if (ringTimeout) {
      clearTimeout(ringTimeout);
      ringTimeout = null;
    }
    isRinging = false;
    stopAllActiveSounds();
    if (wasRinging) {
      notifyRingtoneListeners();
    }
  },

  // Silence active ringtone alias
  silence() {
    this.stopRingtone();
  },

  // Check if currently ringing
  isPlayingRingtone() {
    return isRinging;
  },

  // Subscribe to ringtone state changes (active vs stopped)
  onRingtoneChange(listener) {
    if (typeof listener === 'function') {
      ringtoneListeners.add(listener);
      return () => ringtoneListeners.delete(listener);
    }
    return () => {};
  },

  // Play a single one-shot alert chime
  playOneShot() {
    if (soundMuted) return;
    unlockAudio();
    playAlertChime();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(200); } catch (_) {}
    }
  },

  // Show browser pop-up notification
  showNotification(title, options = {}) {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [200, 100, 200],
          ...options
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        setTimeout(() => notif.close(), 10000);
      }
    } catch (err) {
      console.warn('Notification display failed:', err);
    }
  },

  // Full alert: Starts ringtone (or one-shot) + triggers browser popup notification
  triggerRideAlert({ title, body, repeat = true }) {
    this.showNotification(title, { body, tag: 'papido-ride-request' });
    if (soundMuted) return;
    if (repeat) {
      this.startRingtone();
    } else {
      this.playOneShot();
    }
  }
};

export default alertManager;
