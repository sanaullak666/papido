// Web Audio API Ringtone & Browser Push Notification Manager for Papido
import { apiRequest } from '../api';

let audioCtx = null;
let ringInterval = null;
let isRinging = false;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Auto-unlock AudioContext on first user interaction anywhere on the page
if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown', 'mousedown'];
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };
  unlockEvents.forEach(evt => {
    window.addEventListener(evt, unlockAudio, { passive: true, once: false });
  });
}

// Generates a loud, crisp synthesized WAV audio chime for instant playback across all mobile browsers
function playWavChime() {
  try {
    const sampleRate = 22050;
    const duration = 0.55;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;
      if (t < 0.22) {
        const env = Math.exp(-t * 9);
        sample += (Math.sin(2 * Math.PI * 880 * t) * 0.7 + Math.sin(2 * Math.PI * 1760 * t) * 0.3) * env;
      }
      if (t >= 0.14) {
        const t2 = t - 0.14;
        const env2 = Math.exp(-t2 * 7);
        sample += (Math.sin(2 * Math.PI * 1318.5 * t2) * 0.8 + Math.sin(2 * Math.PI * 2637 * t2) * 0.35) * env2;
      }
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = 1.0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (_) {}
}

// Generates a crisp, loud high-urgency ride-hailing dispatcher ringtone
async function playChimeBeep() {
  // 1. Trigger HTML5 Audio synthesized WAV chime
  playWavChime();

  // 2. Trigger Web Audio API synthesized tones
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    
    // Tone 1: 880 Hz (A5 - Loud Chime)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.85, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Tone 2: 1318.5 Hz (E6 - High Bell)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.5, now + 0.12);
    gain2.gain.setValueAtTime(0.9, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);

    // Tone 3: 1760 Hz (A6 - Bright Ping)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1760, now + 0.25);
    gain3.gain.setValueAtTime(0.85, now + 0.25);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.25);
    osc3.stop(now + 0.6);
  } catch (err) {
    console.warn('Web Audio play notice:', err);
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
  // Request browser push notification permission and unlock AudioContext
  async requestPermission(token = null) {
    if (typeof window !== 'undefined') {
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch (_) {}
      }
      getAudioContext();
      if (token) {
        this.subscribeToPushNotifications(token);
      }
    }
  },

  // Subscribes browser Service Worker to background Push Notifications
  async subscribeToPushNotifications(token) {
    try {
      getAudioContext();

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
          message: 'Notifications are blocked in your browser settings. To enable:\n1. Click the 🔒 Lock icon next to the website URL at the top\n2. Set Notifications to "Allow"\n3. Reload the page.'
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

      return { success: true, reason: 'GRANTED', message: '✅ Lock-screen notifications are now ACTIVE! You will receive ride alerts even when this browser is closed.' };
    } catch (err) {
      console.warn('[PWA Push Error]', err);
      return { success: false, reason: 'ERROR', message: err.message || 'Failed to initialize push subscription.' };
    }
  },

  // Start continuous repeating ringtone
  startRingtone(repeatIntervalMs = 1800) {
    if (isRinging) return;
    isRinging = true;

    getAudioContext();
    playChimeBeep();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([300, 150, 300, 150, 300]); } catch (_) {}
    }

    ringInterval = setInterval(() => {
      playChimeBeep();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([300, 150, 300]); } catch (_) {}
      }
    }, repeatIntervalMs);
  },

  // Stop continuous ringtone
  stopRingtone() {
    if (ringInterval) {
      clearInterval(ringInterval);
      ringInterval = null;
    }
    isRinging = false;
  },

  // Play a single one-shot alert chime (e.g. for completed rides or new admin notifications)
  playOneShot() {
    getAudioContext();
    playChimeBeep();
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

  // Full alert: Starts ringtone + triggers browser popup notification
  triggerRideAlert({ title, body, repeat = true }) {
    this.showNotification(title, { body, tag: 'papido-ride-request' });
    if (repeat) {
      this.startRingtone();
    } else {
      this.playOneShot();
    }
  }
};
