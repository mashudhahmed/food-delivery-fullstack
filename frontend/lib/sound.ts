// frontend/lib/sound.ts

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainVal = 0.15,
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch {
    // Gracefully ignore audio autoplay restrictions
  }
}

/**
 * Pleasant melodic chime for customer order status changes
 */
export function playOrderUpdateSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(659.25, now, 0.25, 'sine', 0.12);
  playTone(830.61, now + 0.1, 0.25, 'sine', 0.12);
  playTone(987.77, now + 0.2, 0.45, 'sine', 0.15);
}

/**
 * Prominent bell chime for restaurant owners when a new order arrives
 */
export function playNewOrderAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(523.25, now, 0.18, 'triangle', 0.18);
  playTone(659.25, now + 0.12, 0.18, 'triangle', 0.18);
  playTone(783.99, now + 0.24, 0.18, 'triangle', 0.18);
  playTone(1046.5, now + 0.36, 0.55, 'sine', 0.22);
}

/**
 * Alert chime for delivery agents when an order becomes ready for pickup
 */
export function playDeliveryAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(880, now, 0.12, 'sine', 0.16);
  playTone(880, now + 0.16, 0.12, 'sine', 0.16);
  playTone(1174.66, now + 0.3, 0.35, 'sine', 0.2);
}
