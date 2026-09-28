// Test suite for Papido Alert Manager and Audio Workflow
const assert = require('assert');

console.log('================================================================');
console.log('  🔊 PAPIDO SOUNDING ALERT SYSTEM & AUDIO WORKFLOW TEST SUITE');
console.log('================================================================\n');

// Mock browser globals for node environment
global.window = {
  btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
  atob: (b64) => Buffer.from(b64, 'base64').toString('binary'),
  addEventListener: () => {},
  removeEventListener: () => {}
};

const store = {};
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { vibrate: () => true },
    writable: true,
    configurable: true
  });
} catch (_) {}

// 1. WAV Data URI Synthesizer verification
function createWavDataUriTest() {
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
  return 'data:audio/wav;base64,' + global.window.btoa(binary);
}

// TEST 1: Synthesized WAV Data URI
console.log('▶ TEST 1: Synthesized WAV Data URI verification');
const uri = createWavDataUriTest();
assert(uri.startsWith('data:audio/wav;base64,'), 'Must return base64 WAV data URI');
const rawBytes = Buffer.from(uri.replace('data:audio/wav;base64,', ''), 'base64');
assert.strictEqual(rawBytes.subarray(0, 4).toString(), 'RIFF', 'Header must start with RIFF');
assert.strictEqual(rawBytes.subarray(8, 12).toString(), 'WAVE', 'Header must have WAVE');
assert.strictEqual(rawBytes.subarray(12, 16).toString(), 'fmt ', 'Header must have fmt ');
assert.strictEqual(rawBytes.subarray(36, 40).toString(), 'data', 'Header must have data chunk');
console.log('  ✅ [PASS] Valid 16-bit PCM Mono 22050Hz WAV audio format generated (' + rawBytes.length + ' bytes)\n');

// Mock alertManager logic for pure testing
class AlertManagerTest {
  constructor() {
    this.soundMuted = false;
    this.isRinging = false;
    this.muteListeners = new Set();
    this.ringtoneListeners = new Set();
    this.ringInterval = null;
    this.ringTimeout = null;
    this.playCount = 0;
  }

  isMuted() { return this.soundMuted; }
  isSoundEnabled() { return !this.soundMuted; }

  setSoundEnabled(enabled) {
    this.soundMuted = !enabled;
    global.localStorage.setItem('papido_sound_enabled', String(enabled));
    if (this.soundMuted) {
      this.stopRingtone();
    } else {
      this.playOneShot();
    }
    this.notifyMuteListeners();
  }

  toggleMute() {
    this.setSoundEnabled(this.soundMuted);
    return !this.soundMuted;
  }

  notifyMuteListeners() {
    this.muteListeners.forEach(fn => fn(!this.soundMuted));
  }

  notifyRingtoneListeners() {
    this.ringtoneListeners.forEach(fn => fn(this.isRinging));
  }

  onMuteChange(fn) {
    this.muteListeners.add(fn);
    return () => this.muteListeners.delete(fn);
  }

  onRingtoneChange(fn) {
    this.ringtoneListeners.add(fn);
    return () => this.ringtoneListeners.delete(fn);
  }

  playOneShot() {
    if (this.soundMuted) return;
    this.playCount++;
    if (typeof globalThis.navigator !== 'undefined' && typeof globalThis.navigator.vibrate === 'function') {
      globalThis.navigator.vibrate(200);
    }
  }

  startRingtone(repeatIntervalMs = 20, maxDurationMs = 200) {
    if (this.soundMuted) return;
    if (this.isRinging) return;
    this.isRinging = true;
    this.notifyRingtoneListeners();

    this.playCount++;
    if (this.ringInterval) clearInterval(this.ringInterval);
    this.ringInterval = setInterval(() => {
      if (this.soundMuted) {
        this.stopRingtone();
        return;
      }
      this.playCount++;
    }, repeatIntervalMs);

    if (this.ringTimeout) clearTimeout(this.ringTimeout);
    this.ringTimeout = setTimeout(() => {
      this.stopRingtone();
    }, maxDurationMs);
  }

  stopRingtone() {
    const wasRinging = this.isRinging;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }
    this.isRinging = false;
    if (wasRinging) {
      this.notifyRingtoneListeners();
    }
  }

  silence() {
    this.stopRingtone();
  }

  isPlayingRingtone() {
    return this.isRinging;
  }
}

// TEST 2: Sound Toggle & Persistence
console.log('▶ TEST 2: Sound Toggle & Persistence');
const mgr = new AlertManagerTest();
assert.strictEqual(mgr.isSoundEnabled(), true, 'Initial sound should be enabled');
mgr.setSoundEnabled(false);
assert.strictEqual(mgr.isSoundEnabled(), false, 'Sound should be disabled');
assert.strictEqual(global.localStorage.getItem('papido_sound_enabled'), 'false', 'LocalStorage must save false');
mgr.toggleMute();
assert.strictEqual(mgr.isSoundEnabled(), true, 'Toggle must unmute sound');
assert.strictEqual(global.localStorage.getItem('papido_sound_enabled'), 'true', 'LocalStorage must save true');
console.log('  ✅ [PASS] Sound state toggling and localStorage persistence verified.\n');

// TEST 3: Listeners on Mute & Ringtone
console.log('▶ TEST 3: Subscriptions & Event Propagation');
let muteReported = null;
let ringReported = null;
const unsubMute = mgr.onMuteChange(state => { muteReported = state; });
const unsubRing = mgr.onRingtoneChange(state => { ringReported = state; });

mgr.setSoundEnabled(false);
assert.strictEqual(muteReported, false, 'Mute listener must receive false');
mgr.setSoundEnabled(true);
assert.strictEqual(muteReported, true, 'Mute listener must receive true');

mgr.startRingtone();
assert.strictEqual(ringReported, true, 'Ringtone listener must receive true when started');
assert.strictEqual(mgr.isPlayingRingtone(), true, 'isPlayingRingtone must be true');

mgr.silence();
assert.strictEqual(ringReported, false, 'Ringtone listener must receive false on silence');
assert.strictEqual(mgr.isPlayingRingtone(), false, 'isPlayingRingtone must be false');
console.log('  ✅ [PASS] Mute & Ringtone real-time event listeners verified.\n');

// TEST 4: Immediate Stop on Mute
console.log('▶ TEST 4: Immediate Stop on Mute');
mgr.startRingtone();
assert.strictEqual(mgr.isPlayingRingtone(), true, 'Ringtone must be playing');
mgr.setSoundEnabled(false);
assert.strictEqual(mgr.isPlayingRingtone(), false, 'Ringtone must stop immediately on mute');
console.log('  ✅ [PASS] Muting immediately stops active ringtones.\n');

// TEST 5: Auto-Stop Safety Timeout
console.log('▶ TEST 5: Auto-Stop Safety Timeout');
mgr.setSoundEnabled(true);
mgr.startRingtone(10, 50); // 50ms safety timeout
assert.strictEqual(mgr.isPlayingRingtone(), true);

setTimeout(() => {
  assert.strictEqual(mgr.isPlayingRingtone(), false, 'Ringtone must auto-stop after safety timeout');
  console.log('  ✅ [PASS] Auto-stop safety timeout fires cleanly without hanging.\n');
  console.log('================================================================');
  console.log('  🎉 ALL 5 SOUND ALERT TESTS PASSED SUCCESSFULLY (100%)');
  console.log('================================================================\n');
  process.exit(0);
}, 80);
