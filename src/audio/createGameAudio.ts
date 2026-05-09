type GameAudio = {
  unlock: () => void;
  playSelect: () => void;
  playStart: () => void;
  playAttack: () => void;
  playGather: () => void;
  playDamage: () => void;
  playRegion: () => void;
  playBuild: () => void;
  playStep: () => void;
};

type AudioBus = "ui" | "action" | "ambient";

type AudioBuses = {
  master: GainNode;
  ui: GainNode;
  action: GainNode;
  ambient: GainNode;
};

type ToneOptions = {
  frequency: number;
  duration: number;
  bus: AudioBus;
  type?: OscillatorType;
  volume?: number;
  endFrequency?: number;
  delay?: number;
};

type CueName = "select" | "start" | "attack" | "gather" | "damage" | "region" | "build" | "step";

const CUE_THROTTLE_MS: Record<CueName, number> = {
  select: 45,
  start: 220,
  attack: 95,
  gather: 75,
  damage: 130,
  region: 180,
  build: 260,
  step: 180,
};

export function createGameAudio(): GameAudio {
  let context: AudioContext | undefined;
  let buses: AudioBuses | undefined;
  let ambientStarted = false;
  const lastCueAt = new Map<CueName, number>();

  function ensureContext(): AudioContext | undefined {
    if (context) return context;

    const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextCtor) return undefined;

    context = new AudioContextCtor();
    buses = createBuses(context);
    return context;
  }

  function createBuses(audioContext: AudioContext): AudioBuses {
    const master = audioContext.createGain();
    const ui = audioContext.createGain();
    const action = audioContext.createGain();
    const ambient = audioContext.createGain();

    master.gain.value = 0.42;
    ui.gain.value = 0.24;
    action.gain.value = 0.28;
    ambient.gain.value = 0.055;

    ui.connect(master);
    action.connect(master);
    ambient.connect(master);
    master.connect(audioContext.destination);

    return { master, ui, action, ambient };
  }

  function unlock(): void {
    const audioContext = ensureContext();
    if (!audioContext) return;

    if (audioContext.state === "suspended") {
      void audioContext.resume().then(startAmbient);
      return;
    }

    startAmbient();
  }

  function startAmbient(): void {
    const audioContext = ensureContext();
    if (!audioContext || !buses || ambientStarted || audioContext.state === "suspended") return;

    ambientStarted = true;

    const tone = audioContext.createOscillator();
    const toneGain = audioContext.createGain();
    tone.type = "sine";
    tone.frequency.value = 54;
    tone.detune.value = -8;
    toneGain.gain.value = 0.11;
    tone.connect(toneGain);
    toneGain.connect(buses.ambient);
    tone.start();

    const noise = audioContext.createBufferSource();
    const noiseFilter = audioContext.createBiquadFilter();
    const noiseGain = audioContext.createGain();
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
      data[index] = (Math.random() * 2 - 1) * 0.42;
    }

    noise.buffer = buffer;
    noise.loop = true;
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 440;
    noiseFilter.Q.value = 0.35;
    noiseGain.gain.value = 0.018;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(buses.ambient);
    noise.start();
  }

  function canPlayCue(cue: CueName): boolean {
    const now = performance.now();
    const lastPlayed = lastCueAt.get(cue) ?? -Infinity;

    if (now - lastPlayed < CUE_THROTTLE_MS[cue]) {
      return false;
    }

    lastCueAt.set(cue, now);
    return true;
  }

  function playCue(cue: CueName, play: () => void): void {
    if (!canPlayCue(cue)) return;
    play();
  }

  function playTone(options: ToneOptions): void {
    const audioContext = ensureContext();
    if (!audioContext || !buses) return;

    const startedAt = audioContext.currentTime + (options.delay ?? 0);
    const endedAt = startedAt + options.duration;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = options.type ?? "triangle";
    oscillator.frequency.setValueAtTime(options.frequency, startedAt);

    if (options.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), endedAt);
    }

    gain.gain.setValueAtTime(0.0001, startedAt);
    gain.gain.exponentialRampToValueAtTime(options.volume ?? 0.08, startedAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, endedAt);
    oscillator.connect(gain);
    gain.connect(buses[options.bus]);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(startedAt);
    oscillator.stop(endedAt + 0.025);
  }

  function playNoiseBurst(bus: AudioBus, volume: number, duration: number, delay = 0): void {
    const audioContext = ensureContext();
    if (!audioContext || !buses) return;

    const startedAt = audioContext.currentTime + delay;
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const buffer = audioContext.createBuffer(1, Math.max(1, Math.floor(audioContext.sampleRate * duration)), audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 760;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(0.0001, startedAt);
    gain.gain.exponentialRampToValueAtTime(volume, startedAt + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(buses[bus]);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(startedAt);
  }

  return {
    unlock,
    playSelect: () => {
      playCue("select", () => {
        playTone({ bus: "ui", frequency: 740, endFrequency: 880, duration: 0.055, volume: 0.16 });
      });
    },
    playStart: () => {
      playCue("start", () => {
        playTone({ bus: "ui", frequency: 196, endFrequency: 392, duration: 0.15, volume: 0.18 });
        playTone({ bus: "ui", frequency: 294, endFrequency: 588, duration: 0.18, volume: 0.13, delay: 0.055 });
        playTone({ bus: "ui", frequency: 392, endFrequency: 784, duration: 0.2, volume: 0.1, delay: 0.11 });
      });
    },
    playAttack: () => {
      playCue("attack", () => {
        playNoiseBurst("action", 0.12, 0.075);
        playTone({ bus: "action", frequency: 720, endFrequency: 132, duration: 0.14, type: "sawtooth", volume: 0.13 });
      });
    },
    playGather: () => {
      playCue("gather", () => {
        playTone({ bus: "ui", frequency: 470, endFrequency: 610, duration: 0.07, volume: 0.12 });
        playTone({ bus: "ui", frequency: 705, endFrequency: 920, duration: 0.085, volume: 0.09, delay: 0.045 });
      });
    },
    playDamage: () => {
      playCue("damage", () => {
        playNoiseBurst("action", 0.15, 0.11);
        playTone({ bus: "action", frequency: 172, endFrequency: 74, duration: 0.2, type: "square", volume: 0.12 });
      });
    },
    playRegion: () => {
      playCue("region", () => {
        playTone({ bus: "ambient", frequency: 330, endFrequency: 392, duration: 0.18, volume: 0.13 });
        playTone({ bus: "ambient", frequency: 495, endFrequency: 588, duration: 0.22, volume: 0.095, delay: 0.08 });
      });
    },
    playBuild: () => {
      playCue("build", () => {
        playNoiseBurst("action", 0.08, 0.06);
        playTone({ bus: "ui", frequency: 220, endFrequency: 330, duration: 0.11, volume: 0.12 });
        playTone({ bus: "ui", frequency: 392, endFrequency: 588, duration: 0.16, volume: 0.1, delay: 0.055 });
      });
    },
    playStep: () => {
      playCue("step", () => {
        playNoiseBurst("ambient", 0.018, 0.035);
      });
    },
  };
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
