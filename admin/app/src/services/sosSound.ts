let audioContext: AudioContext | null = null;
let unlockListenersAttached = false;
let pendingSosSound = false;

const canUseAudio = () =>
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  Boolean(window.AudioContext || (window as any).webkitAudioContext);

const getAudioContext = () => {
  if (!canUseAudio()) return null;

  if (!audioContext) {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextCtor();
  }

  return audioContext;
};

const playUnlockedSosSound = (ctx: AudioContext) => {
  const now = ctx.currentTime;
  const duration = 3;
  const pulseSeconds = 0.2;

  const createTone = (frequency: number, volume: number) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, now);

    for (let t = 0; t < duration; t += pulseSeconds) {
      const isOn = Math.floor(t / pulseSeconds) % 2 === 0;
      gain.gain.setValueAtTime(isOn ? volume : 0, now + t);
    }

    gain.gain.setValueAtTime(0, now + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  };

  createTone(880, 0.3);
  createTone(1200, 0.2);
};

export const playSosSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      pendingSosSound = true;
      ctx.resume()
        .then(() => {
          if (ctx.state === 'running') {
            pendingSosSound = false;
            playUnlockedSosSound(ctx);
          }
        })
        .catch((error) => {
          pendingSosSound = true;
          console.warn('Could not unlock SOS sound yet:', error);
        });
      return;
    }

    pendingSosSound = false;
    playUnlockedSosSound(ctx);
  } catch (error) {
    pendingSosSound = true;
    console.warn('Could not play SOS sound', error);
  }
};

export const initSosSoundUnlock = () => {
  if (unlockListenersAttached || !canUseAudio()) return;
  unlockListenersAttached = true;

  const unlock = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    ctx.resume()
      .then(() => {
        if (pendingSosSound && ctx.state === 'running') {
          pendingSosSound = false;
          playUnlockedSosSound(ctx);
        }
      })
      .catch(() => undefined);
  };

  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock, { passive: true });
};
