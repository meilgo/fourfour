const STEPS = 16;
const instruments = ["Perc", "Crash", "Ride", "Hi-Hat", "Rim", "Tom Hi", "Snare", "Kick"];
const BANKS = 4;
let currentKit = "Acoustic";
let currentRhythm = "Rock";
let currentBank = 0;
let bankStates = Array.from({ length: BANKS }, () =>
  instruments.map(() => Array(STEPS).fill(0))
);

const sequencer = document.getElementById("sequencer");
const glowCanvas = document.getElementById("glowCanvas");
const bankTabs = document.getElementById("bankTabs");
const playBtn = document.getElementById("playBtn");
const clearBtn = document.getElementById("clearBtn");
const recordBtn = document.getElementById("recordBtn");
const recordTimer = document.getElementById("recordTimer");
const recordTimerDigits = document.getElementById("recordTimerDigits");
const clearConfirmModal = document.getElementById("clearConfirmModal");
const confirmClearBtn = document.getElementById("confirmClearBtn");
const cancelClearBtn = document.getElementById("cancelClearBtn");
const restartBtn = document.getElementById("restartBtn");
const bpmValue = document.getElementById("bpmValue");
const bpmMinus = document.getElementById("bpmMinus");
const bpmPlus = document.getElementById("bpmPlus");
const topBpmValue = document.getElementById("topBpmValue");
const topBpmMinus = document.getElementById("topBpmMinus");
const topBpmPlus = document.getElementById("topBpmPlus");
const topBpm = document.getElementById("topBpm");
const playheadBar = document.getElementById("playheadBar");
const schemeSelector = document.getElementById("schemeSelector");
const lightingToggle = document.getElementById("lightingToggle");
const motionLayer = document.getElementById("motionLayer");
const vizGrid = document.getElementById("vizGrid");
const sdPad = document.getElementById("sdPad");
const sdPower = document.getElementById("sdPower");
const sdDice = document.getElementById("sdDice");
const appEl = document.querySelector(".app");
const pointerCoarse = window.matchMedia("(pointer: coarse)").matches;
const memory = navigator.deviceMemory || 4;
const cores = navigator.hardwareConcurrency || 4;
const dpr = window.devicePixelRatio || 1;
let lightingTier = "full";
if (pointerCoarse) {
  // Mobile devices keep static highlights only (no sustained RAF, no accent flash)
  // to avoid frame drops on iOS WebKit. Reveal strokes are computed once on click.
  if (memory >= 4 && cores >= 4) lightingTier = "reduced";
  else lightingTier = "minimal";
}
const panelToggle = document.getElementById("panelToggle");
const volumeSlider = document.getElementById("volumeSlider");
const volumeIconBtn = document.getElementById("volumeIconBtn");
const volumeControl = document.getElementById("volumeControl");
let beatNumbers = document.querySelectorAll(".beat-number");
let beatDots = document.querySelectorAll(".beat-dot");
let beatMarkerEls = [];
const beatMarkers = document.getElementById("beatMarkers");
const trackVolumesContainer = document.getElementById("trackVolumes");

let pads = [];
let isPlaying = false;
let isLoadingAudio = false;
let isRecording = false;
let recordStartTime = 0;
let recordRaf = null;
let lastRecordSeconds = -1;
let currentStep = 0;
let bpm = 110;
let timer = null;
const SCHEMES = ['off', 'aura', 'keylight'];
let lightingScheme = pointerCoarse ? 'keylight' : 'aura';
let lightingEnabled = lightingScheme !== 'off';
let schemeBeforeOff = lightingScheme;
if (appEl) {
  appEl.classList.add(`tier-${lightingTier}`);
  appEl.setAttribute('data-lighting-scheme', lightingScheme);
  appEl.classList.toggle('lighting-off', !lightingEnabled);
}
let volume = 0.8;
let isMuted = false;
let volumeBeforeMute = 0.8;
let settleTimeout = null;
let timeSignature = { top: 4, bottom: 4 };
let accentSteps = [];
let accentHitTimer = null;
let glowCtx = null;
let glowRaf = null;
let glowPadRects = [];
let glowScale = 1;
var trackLabels = [];
let accentGlowActive = false;
const trackVolumes = Array(instruments.length).fill(0.8);
const mutedTracks = Array(instruments.length).fill(false);
const soloTracks = Array(instruments.length).fill(false);
let kitChannelAssignments = {}; // { kitName: { bankIdx: { rowIdx: channelKey } } }

const kits = {
  Acoustic: {
    masterGain: 0.95,
    channelGains: {
      Kick: 0.9,
      Snare: 0.75,
      "Tom Hi": 1,
      Rim: 1,
      "Hi-Hat": 1.05,
      Crash: 0.95,
      Ride: 0.95,
      Perc: 1,
    },
    labels: ["Sidestick", "Ride", "Crash", "Hi-Hat", "Rack Tom", "Floor Tom", "Snare", "Kick"],
    samples: {
      Kick: [
        "samples/Acoustic/20%20Inch%20Kick4.wav",
        "samples/Acoustic/20%20Inch%20Kick%20Dampened3.wav",
      ],
      Snare: [
        "samples/Acoustic/SLP%20Aluminium%20Snare3.wav",
        "samples/Acoustic/SLP%20Aluminium%20Tuned%20Down%20Snare3.wav",
        "samples/Acoustic/SLP%20Aluminium%20Tuned%20Up%20Snare3.wav",
      ],
      "Tom Hi": [
        "samples/Acoustic/Floor%20Tom%2016%20Inch4.wav",
      ],
      Rim: [
        "samples/Acoustic/Rack%20Tom2.wav",
      ],
      "Hi-Hat": [
        "samples/Acoustic/Prototype%20Dry%20Hihat%20Closed3.wav",
        "samples/Acoustic/Flat%20Hats%2014%20Inch%20Open5.wav",
        "samples/Acoustic/Flat%20Hats%2014%20Inch%20Half%20Open3.wav",
      ],
      Crash: [
        "samples/Acoustic/HHXtreme%20Crash%2019%20Inch4.wav",
      ],
      Ride: [
        "samples/Acoustic/Artisan%20Lite%20Ride%2022%20Inch3.wav",
      ],
      Perc: [
        "samples/Acoustic/Birch%20Snare%2012%20Inch%20Sidestick3.wav",
        "samples/Acoustic/Radioking%20Snare%20Sidestick3.wav",
      ],
    },
  },
  Vinyl: {
    masterGain: 0.88,
    channelGains: {
      Kick: 0.95,
      Snare: 0.9,
      "Tom Hi": 1,
      Rim: 1,
      "Hi-Hat": 1,
      Crash: 0.95,
      Ride: 0.95,
      Perc: 1.05,
    },
    labels: ["Perc", "Crash", "Ride", "Hi-Hat", "Rim", "Tom Hi", "Snare", "Kick"],
    samples: {
      Kick: [
        "samples/Vinyl/BD%20Clean%20Vinyl%2007.wav",
        "samples/Vinyl/BD%20Clean%20Vinyl%2011.wav",
      ],
      Snare: ["samples/Vinyl/SD%20Degraded%20Vinyl%2006.wav"],
      "Hi-Hat": [
        "samples/Vinyl/CH%20Color%20Hi%20Vinyl%2003.wav",
        "samples/Vinyl/CH%20Color%20Vinyl%2003.wav",
        "samples/Vinyl/CH%20Color%20Vinyl%2008.wav",
      ],
      "Tom Hi": ["samples/Vinyl/Tom%20Silky%20Vinyl%2002.wav"],
      Rim: ["samples/Vinyl/Rim%20Tube%20Vinyl%2003.wav"],
      Perc: ["samples/Vinyl/Shaker%20Hard%20Vinyl.wav"],
      Ride: ["samples/Vinyl/Ride%20FX%20Phaser%20Vinyl%2003.wav"],
      Crash: ["samples/Vinyl/Crash%20FX%20Wobble%20Vinyl%2001.wav"],
    },
  },
  "808": {
    masterGain: 0.85,
    channelGains: {
      Kick: 0.92,
      Snare: 0.88,
      "Tom Hi": 1,
      Rim: 1,
      "Hi-Hat": 1,
      Crash: 0.95,
      Ride: 0.95,
      Perc: 0.95,
    },
    labels: ["Clap", "Crash", "Cowbell", "Hi-Hat", "Rim", "Tom", "Snare", "Kick"],
    samples: {
      Kick: [
        "samples/808/BD%20808%20Mid%20Color%20A%2005.wav",
        "samples/808/BD%20808%20Sat%20Click%20Decay%20B%2002.wav",
        "samples/808/BD%20808%20Noise%2001.wav",
      ],
      Snare: [
        "samples/808/SD%20B%20808%20Tape%20Tone%20C%2006.wav",
        "samples/808/SD%20808%20Crisp%20B%2002.wav",
      ],
      "Hi-Hat": [
        "samples/808/CH%20A%20808%20Tape.wav",
        "samples/808/OH%20808%20Tape%20Decay%2002.wav",
        "samples/808/OH%20808%20Sat%20A%2002.wav",
      ],
      "Tom Hi": [
        "samples/808/Tom%20Low%20A%20808%2003.wav",
        "samples/808/Tom%20Mid%20A%20808%2008.wav",
        "samples/808/Tom%20Hi%20A%20808%2008.wav",
      ],
      Rim: ["samples/808/Rim%20Shot%20A%20808%20Tape.wav"],
      Perc: [
        "samples/808/Clap%20808%20Color%2003.wav",
        "samples/808/Clap%20A%20808.wav",
      ],
      Ride: ["samples/808/Cowbell%20808%20Color%20Short%2003.wav"],
      Crash: ["samples/808/Cym%20A%20808%20Tape%20Decay%20C%2001.wav"],
    },
    channels: {
      4: [
        { key: "Rim", label: "Rim", samples: ["samples/808/Rim%20Shot%20A%20808%20Tape.wav"] },
        { key: "Conga", label: "Conga", samples: [
          "samples/808/LC50.WAV",
          "samples/808/MC50.WAV",
          "samples/808/HC50.WAV",
        ]},
      ],
    },
  },
};

const isLocalhost = (() => {
  const host = location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    location.protocol === "file:"
  );
})();

const SAMPLE_BASE = isLocalhost
  ? ""
  : "https://fourfour-samples-1333371641.cos.ap-guangzhou.myqcloud.com";

function prefixSamples() {
  Object.values(kits).forEach((kit) => {
    Object.keys(kit.samples).forEach((key) => {
      const urls = kit.samples[key];
      kit.samples[key] = (Array.isArray(urls) ? urls : [urls]).map(
        (url) => `${SAMPLE_BASE}/${url}`
      );
    });
    Object.values(kit.channels || {}).forEach((channelList) => {
      channelList.forEach((channel) => {
        const urls = channel.samples;
        channel.samples = (Array.isArray(urls) ? urls : [urls]).map(
          (url) => `${SAMPLE_BASE}/${url}`
        );
      });
    });
  });
}

prefixSamples();

let audioCtx = null;
let masterOut = null;
let sampleBuffers = {};
let loadPromise = null;
let scriptProcessor = null;
let recordedBuffersL = [];
let recordedBuffersR = [];

// 8 轨：按音高/重要性从下到上为 Kick, Snare, Tom Hi, Rim, Hi-Hat, Ride, Crash, Perc
const patterns = {
  Rock: [
    [], [], [], [0, 2, 4, 6, 8, 10, 12, 14], [], [], [4, 12], [0, 6, 8]
  ],
  Funk: [
    [],
    [],
    [],
    [0, 2, 4, 6, 8, 10, 12, 14],
    [],
    [],
    [[3, 1], [4, 3], [7, 1], [9, 1], [11, 1], [12, 3], [15, 1]],
    [[0, 2], [2, 2], [6, 1], [10, 1], [13, 1]],
  ],
  Techno: [
    [4, 12],
    [],
    [],
    [0, 2, [4, 3], 6, 8, 10, 12, [14, 3]],
    [[10, 2], [11, 1]],
    [],
    [],
    [0, 4, 8, 12],
  ],
};

// 某些节奏预设中，特定鼓件使用固定 layer 而非最大层
// 支持按当前套件（currentKit）覆盖，例如 Rock 的 Hi-Hat 在默认套件用第 2 层，在 Acoustic 用第 1 层
const patternLayers = {
  Rock: {
    "Hi-Hat": { default: 2, Acoustic: 1 },
    "Snare": { Acoustic: 1 },
  },
  Funk: {
    "Hi-Hat": 1,
  },
  Techno: {
    Perc: 2,
    "Hi-Hat": 1,
    Kick: 2,
  },
};

// 节奏预设中需要切换的通道配置：{ 节奏名: { 行索引: 通道 key } }
const patternChannels = {
  Techno: { 4: "Conga" },
};

// 节奏预设中的重音标记位置
const patternAccents = {
  Rock: [0, 4, 8, 12],
  Techno: [0, 4, 8, 12],
};

function getPatternLayer(name, rowIdx, maxLayer) {
  const inst = instruments[rowIdx];
  const config = patternLayers[name]?.[inst];
  if (config == null) return maxLayer;
  const target = typeof config === "object"
    ? (config[currentKit] ?? config.default ?? maxLayer)
    : config;
  return Math.min(target, maxLayer);
}

function hasActivePads(bank) {
  return bankStates[bank].some((row) => row.some((layer) => layer > 0));
}

function setBank(idx) {
  if (idx === currentBank) return;
  currentBank = idx;
  bankTabs.querySelectorAll(".bank-btn").forEach((btn) => {
    btn.classList.toggle("active", parseInt(btn.dataset.bank, 10) === currentBank);
  });
  syncDomToBank();
  updateVisualization();
}

function advanceBank() {
  for (let i = 1; i < BANKS; i++) {
    const nextBank = (currentBank + i) % BANKS;
    if (hasActivePads(nextBank)) {
      setBank(nextBank);
      return;
    }
  }
}

function syncDomToBank() {
  pads.forEach((row, rowIdx) => {
    const maxLayer = getMaxLayer(rowIdx);
    row.forEach((pad, col) => {
      updatePadVisuals(pad, bankStates[currentBank][rowIdx][col], maxLayer);
    });
  });
  trackLabels.forEach((label, rowIdx) => {
    if (label) label.textContent = getActiveChannel(rowIdx).label;
  });
  refreshSelectedCenters();
  scheduleRevealUpdate();
}

function resolvePatternCell(patternRow, col, defaultLayer) {
  if (!Array.isArray(patternRow)) return 0;
  for (const item of patternRow) {
    if (Array.isArray(item)) {
      if (item[0] === col) return item[1] ?? 0;
    } else if (item === col) {
      return defaultLayer;
    }
  }
  return 0;
}

function buildPatternRow(name, rowIdx) {
  const pattern = patterns[name];
  if (!pattern) return Array(STEPS).fill(0);
  const maxLayer = getMaxLayer(rowIdx);
  const defaultLayer = getPatternLayer(name, rowIdx, maxLayer);
  return Array.from({ length: STEPS }, (_, col) => {
    const layer = resolvePatternCell(pattern[rowIdx], col, defaultLayer);
    return layer > 0 ? Math.min(layer, maxLayer) : 0;
  });
}

function applyPatternToBank(name, bank) {
  if (!patterns[name]) return;
  bankStates[bank] = instruments.map((_, rowIdx) => buildPatternRow(name, rowIdx));
}

function applyPattern(name) {
  applyPatternToBank(name, currentBank);
  syncDomToBank();
  updateVisualization();
}

function applyPatternAllBanks(name) {
  if (!patterns[name]) return;
  bankStates = Array.from({ length: BANKS }, (_, bank) => {
    if (bank !== 0) {
      return instruments.map(() => Array(STEPS).fill(0));
    }
    return instruments.map((_, rowIdx) => buildPatternRow(name, rowIdx));
  });
  accentSteps = patternAccents[name] ? [...patternAccents[name]] : [];
  buildBeatMarkers();
}

function setAudioLoading(loading) {
  isLoadingAudio = loading;
  playBtn.classList.toggle("loading", loading);
  playBtn.disabled = loading;
}

async function ensureAudio() {
  if (loadPromise) return loadPromise;
  setAudioLoading(true);
  loadPromise = (async () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!masterOut) {
      masterOut = audioCtx.createGain();
      masterOut.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
    await loadSamples();
  })();
  try {
    await loadPromise;
  } finally {
    setAudioLoading(false);
  }
  return loadPromise;
}

async function loadChannelBuffers(channel) {
  const key = channel.key;
  const urls = channel.samples;
  if (!urls || sampleBuffers[key]) return;

  const urlList = Array.isArray(urls) ? urls : [urls];
  sampleBuffers[key] = [];
  const jobs = urlList.map((url, i) =>
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr = await res.arrayBuffer();
        sampleBuffers[key][i] = await audioCtx.decodeAudioData(arr);
      } catch (err) {
        console.warn("加载采样失败:", key, url, err);
      }
    })()
  );

  await Promise.all(jobs);
}

async function loadSamples() {
  const jobs = [];
  for (let rowIdx = 0; rowIdx < instruments.length; rowIdx++) {
    jobs.push(loadChannelBuffers(getActiveChannel(rowIdx)));
  }
  await Promise.all(jobs);
}

function getAllChannelsForKit(kit) {
  const map = new Map();
  // Default channels from the kit's label order
  instruments.forEach((key, idx) => {
    const label = kit?.labels?.[idx] ?? key;
    const samples = kit?.samples?.[key];
    if (samples) {
      map.set(key, { key, label, samples });
    }
  });
  // Extra alternate channels (e.g. 808 Conga)
  Object.values(kit?.channels || {}).forEach((list) => {
    list.forEach((ch) => {
      if (!map.has(ch.key)) {
        map.set(ch.key, { ...ch });
      }
    });
  });
  return Array.from(map.values());
}

function getActiveChannel(rowIdx) {
  const kit = kits[currentKit];
  const all = getAllChannelsForKit(kit);
  const defaultKey = instruments[rowIdx];
  const assignedKey = kitChannelAssignments[currentKit]?.[currentBank]?.[rowIdx];
  const key = assignedKey || defaultKey;
  return (
    all.find((ch) => ch.key === key) || {
      key: defaultKey,
      label: kit?.labels?.[rowIdx] ?? defaultKey,
      samples: kit?.samples?.[defaultKey],
    }
  );
}

function getMaxLayer(rowIdx) {
  const channel = getActiveChannel(rowIdx);
  const urls = channel?.samples;
  return Math.max(1, Array.isArray(urls) ? urls.length : 1);
}

function playInstrument(name, when, layer, channelKey) {
  const buffers = sampleBuffers[channelKey ?? name];
  if (!audioCtx || !buffers || buffers.length === 0) return;
  const maxLayer = Math.max(1, buffers.length);
  const idx = Math.max(0, Math.min((layer ?? maxLayer) - 1, maxLayer - 1));
  const buf = buffers[idx];
  if (!buf) return;
  const t = when ?? audioCtx.currentTime;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  const instIdx = instruments.indexOf(name);
  const anySolo = soloTracks.some(Boolean);
  const isAudible = !mutedTracks[instIdx] && (!anySolo || soloTracks[instIdx]);
  const sampleGain = (currentKit === "Acoustic" && name === "Snare" && idx === 0) ? 0.7 : 1;
  const kit = kits[currentKit] ?? {};
  const kitMasterGain = kit.masterGain ?? 1;
  const kitChannelGain = kit.channelGains?.[name] ?? 1;
  const isAccent = accentSteps.includes(currentStep);
  let finalGain = volume * (trackVolumes[instIdx] ?? 1) * kitMasterGain * kitChannelGain * sampleGain;
  if (isAccent) finalGain = 1;
  gain.gain.value = isAudible ? finalGain : 0;
  src.connect(gain);
  gain.connect(masterOut || audioCtx.destination);
  src.start(t);
}

function playStep(step) {
  if (!audioCtx) return;
  const time = audioCtx.currentTime + 0.02;
  bankStates[currentBank].forEach((row, rowIdx) => {
    const layer = row[step];
    if (layer > 0) {
      const channel = getActiveChannel(rowIdx);
      playInstrument(instruments[rowIdx], time, layer, channel.key);
    }
  });
}

function updatePadVisuals(pad, layer, maxLayer) {
  pad.classList.toggle("active", layer > 0);
  const ratio = maxLayer > 0 ? Math.min(1, layer / maxLayer) : 0;
  pad.style.setProperty("--layer-ratio", ratio);

  // Layer shape + color indicator
  pad.classList.remove("layer-1", "layer-2", "layer-3");
  const marker = pad.querySelector(".pad-layer-marker");
  if (marker) {
    marker.classList.remove("marker-dot", "marker-ring", "marker-star");
  }
  if (layer > 0) {
    const clamped = Math.min(3, layer);
    pad.classList.add(`layer-${clamped}`);
    if (marker) {
      const shapeClass = clamped === 1 ? "marker-dot" : clamped === 2 ? "marker-ring" : "marker-star";
      marker.classList.add(shapeClass);
    }
  }

  // Keep canvas glow cache in sync
  const row = parseInt(pad.dataset.row, 10);
  const col = parseInt(pad.dataset.col, 10);
  if (!Number.isNaN(row) && !Number.isNaN(col) && glowPadRects[row * STEPS + col]) {
    glowPadRects[row * STEPS + col].layerRatio = ratio;
  }
}

function initGlowCanvas() {
  if (!glowCanvas) return;
  glowCtx = glowCanvas.getContext("2d", { alpha: true });
  resizeGlowCanvas();
  cacheGlowPadRects();
}

function resizeGlowCanvas() {
  if (!glowCanvas || !sequencer) return;
  const cssWidth = sequencer.clientWidth;
  const cssHeight = sequencer.clientHeight;
  // iPad: render at 1x to keep GPU cost low; desktop: up to DPR 1.5
  glowScale = pointerCoarse ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
  glowCanvas.width = Math.max(1, Math.floor(cssWidth * glowScale));
  glowCanvas.height = Math.max(1, Math.floor(cssHeight * glowScale));
  glowCanvas.style.width = cssWidth + "px";
  glowCanvas.style.height = cssHeight + "px";
  if (glowCtx) {
    glowCtx.setTransform(glowScale, 0, 0, glowScale, 0, 0);
  }
}

function cacheGlowPadRects() {
  if (!sequencer) return;
  glowPadRects = [];
  const seqRect = sequencer.getBoundingClientRect();
  pads.forEach((row, r) => {
    row.forEach((pad, c) => {
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      glowPadRects[r * STEPS + c] = {
        x: rect.left - seqRect.left,
        y: rect.top - seqRect.top,
        w: rect.width,
        h: rect.height,
        layerRatio: parseFloat(pad.style.getPropertyValue("--layer-ratio")) || 1,
      };
    });
  });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawAccentGlow(opacity) {
  if (!glowCtx || !glowCanvas) return;
  const cssWidth = sequencer.clientWidth;
  const cssHeight = sequencer.clientHeight;
  glowCtx.clearRect(0, 0, cssWidth, cssHeight);
  if (lightingScheme !== 'aura' || !lightingEnabled || opacity <= 0.001) return;

  // Glow parameters tuned to match the original 0 0 26px 6px box-shadow
  const baseBlur = 26;
  const baseSpread = 6;
  const baseAlpha = 0.32;

  pads.forEach((row, r) => {
    row.forEach((pad, c) => {
      if (!pad || !pad.classList.contains("active")) return;
      const rect = glowPadRects[r * STEPS + c];
      if (!rect) return;
      const ratio = rect.layerRatio;
      const blur = baseBlur * ratio;
      const spread = baseSpread * ratio;
      const alpha = baseAlpha * ratio * opacity;

      glowCtx.save();
      // Outer soft halo
      glowCtx.shadowColor = `rgba(255, 255, 255, ${alpha})`;
      glowCtx.shadowBlur = blur;
      glowCtx.fillStyle = "rgba(255, 255, 255, 0)";
      drawRoundedRect(
        glowCtx,
        rect.x - spread,
        rect.y - spread,
        rect.w + spread * 2,
        rect.h + spread * 2,
        6 + spread
      );
      glowCtx.fill();

      // Brighter inner core
      glowCtx.shadowColor = `rgba(255, 255, 255, ${alpha * 0.6})`;
      glowCtx.shadowBlur = blur * 0.4;
      glowCtx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.25})`;
      drawRoundedRect(glowCtx, rect.x, rect.y, rect.w, rect.h, 6);
      glowCtx.fill();
      glowCtx.restore();
    });
  });
}

function animateAccentGlow(duration) {
  if (!glowCanvas || !glowCtx) return;
  accentGlowActive = true;
  const start = performance.now();
  if (glowRaf) cancelAnimationFrame(glowRaf);

  function frame(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Fast-in, slow-peak, fast-out envelope
    const opacity = Math.sin(progress * Math.PI);
    drawAccentGlow(opacity);
    if (progress < 1) {
      glowRaf = requestAnimationFrame(frame);
    } else {
      accentGlowActive = false;
      drawAccentGlow(0);
    }
  }
  glowRaf = requestAnimationFrame(frame);
}

function stopAccentGlow() {
  accentGlowActive = false;
  if (glowRaf) {
    cancelAnimationFrame(glowRaf);
    glowRaf = null;
  }
  drawAccentGlow(0);
}

function buildSequencer() {
  sequencer.innerHTML = "";
  pads = [];
  trackLabels = [];
  instruments.forEach((name, rowIdx) => {
    const channel = getActiveChannel(rowIdx);
    const label = document.createElement("button");
    label.className = "track-label";
    label.type = "button";
    label.textContent = channel.label;
    label.dataset.row = rowIdx;
    label.setAttribute("aria-haspopup", "listbox");
    label.setAttribute("aria-expanded", "false");
    label.addEventListener("click", (e) => {
      e.stopPropagation();
      openChannelMorph(label, rowIdx);
    });
    sequencer.appendChild(label);
    trackLabels[rowIdx] = label;

    const rowPads = [];
    for (let col = 0; col < STEPS; col++) {
      const pad = document.createElement("button");
      pad.className = "pad";
      pad.dataset.row = rowIdx;
      pad.dataset.col = col;
      pad.type = "button";

      const marker = document.createElement("span");
      marker.className = "pad-layer-marker";
      marker.setAttribute("aria-hidden", "true");
      pad.appendChild(marker);

      pad.addEventListener("click", () => {
        ensureAudio().then(() => {
          const currentMaxLayer = getMaxLayer(rowIdx);
          let layer = bankStates[currentBank][rowIdx][col];
          layer = layer >= currentMaxLayer ? 0 : layer + 1;
          bankStates[currentBank][rowIdx][col] = layer;
          updatePadVisuals(pad, layer, currentMaxLayer);
          updateVisualization();
          if (layer > 0) {
            const channel = getActiveChannel(rowIdx);
            playInstrument(instruments[rowIdx], null, layer, channel.key);
          }
          refreshSelectedCenters();
          scheduleRevealUpdate();
        });
      });
      sequencer.appendChild(pad);
      rowPads.push(pad);
    }
    pads.push(rowPads);
  });
  initGlowCanvas();
}

function updateTrackLabels() {
  document.querySelectorAll(".track-label").forEach((el) => {
    const rowIdx = parseInt(el.dataset.row, 10);
    if (Number.isNaN(rowIdx)) return;
    const channel = getActiveChannel(rowIdx);
    el.textContent = channel.label;
  });
}

let activeChannelMorph = null;

function openChannelMorph(labelEl, rowIdx) {
  closeChannelMorph();
  const kit = kits[currentKit];
  const channels = getAllChannelsForKit(kit);
  if (channels.length < 2) return;

  const rect = labelEl.getBoundingClientRect();
  const vv = window.visualViewport;
  // iOS Safari 双指缩放后，getBoundingClientRect() 返回视觉视口坐标，
  // 而 position:fixed 元素是相对于布局视口定位的，需要补上视觉视口的偏移。
  const vvLeft = vv ? vv.offsetLeft : 0;
  const vvTop = vv ? vv.offsetTop : 0;
  const fixedLeft = rect.left + vvLeft;
  const fixedTop = rect.top + vvTop;
  const fixedBottom = rect.bottom + vvTop;

  const currentKey = getActiveChannel(rowIdx).key;
  const menuWidth = 140;
  const menuHeight = channels.length * 32 + 8;
  const targetWidth = Math.max(menuWidth, rect.width);
  const targetHeight = Math.max(menuHeight, rect.height);

  const viewportHeight = vv ? vv.height : window.innerHeight;
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;
  const expandUpward = menuHeight > spaceBelow && menuHeight <= spaceAbove;
  const targetTop = expandUpward ? fixedBottom - targetHeight : fixedTop;

  const morph = document.createElement("div");
  morph.className = "channel-morph";
  morph.style.left = `${fixedLeft}px`;
  morph.style.top = `${fixedTop}px`;
  morph.style.width = `${rect.width}px`;
  morph.style.height = `${rect.height}px`;
  morph.style.borderRadius = "4px";
  morph.dataset.row = rowIdx;
  morph.dataset.originWidth = `${rect.width}px`;
  morph.dataset.originHeight = `${rect.height}px`;
  morph.dataset.originTop = `${fixedTop}px`;
  morph.dataset.targetWidth = `${targetWidth}px`;
  morph.dataset.targetHeight = `${targetHeight}px`;
  morph.dataset.targetTop = `${targetTop}px`;
  morph.dataset.expandUpward = String(expandUpward);

  const labelClone = document.createElement("div");
  labelClone.className = "morph-label";
  labelClone.textContent = labelEl.textContent;
  morph.appendChild(labelClone);

  const menu = document.createElement("div");
  menu.className = "morph-menu";
  menu.setAttribute("role", "listbox");
  channels.forEach((channel) => {
    const option = document.createElement("div");
    option.className = "morph-option";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(channel.key === currentKey));
    option.textContent = channel.label;
    option.dataset.key = channel.key;
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      const newLabel = channel.label;
      labelEl.textContent = newLabel;
      const morphLabel = morph.querySelector(".morph-label");
      if (morphLabel) morphLabel.textContent = newLabel;
      selectChannel(rowIdx, channel.key);
      closeChannelMorph();
    });
    menu.appendChild(option);
  });
  morph.appendChild(menu);

  document.body.appendChild(morph);
  activeChannelMorph = morph;
  labelEl.setAttribute("aria-expanded", "true");

  requestAnimationFrame(() => {
    morph.setAttribute("data-open", "true");
    morph.style.width = morph.dataset.targetWidth;
    morph.style.height = morph.dataset.targetHeight;
    morph.style.top = morph.dataset.targetTop;
    morph.style.borderRadius = "8px";
    document.addEventListener("click", outsideMorphClick, { once: true });
    document.addEventListener("keydown", morphKeydown);
  });

  const onOpenEnd = (e) => {
    if (e.propertyName === "width" && e.target === morph) {
      morph.removeEventListener("transitionend", onOpenEnd);
      if (lightingScheme === "aura") {
        refreshRevealEls();
        scheduleRevealUpdate();
      }
    }
  };
  morph.addEventListener("transitionend", onOpenEnd);
}

function closeChannelMorph() {
  if (!activeChannelMorph) return;
  const morph = activeChannelMorph;
  const rowIdx = morph.dataset.row;
  const labelEl = document.querySelector(`.track-label[data-row="${rowIdx}"]`);
  if (labelEl) labelEl.setAttribute("aria-expanded", "false");

  morph.removeAttribute("data-open");
  morph.style.width = morph.dataset.originWidth;
  morph.style.height = morph.dataset.originHeight;
  morph.style.top = morph.dataset.originTop;
  morph.style.borderRadius = "4px";

  setTimeout(() => {
    morph.remove();
    if (activeChannelMorph === morph) activeChannelMorph = null;
    if (lightingScheme === "aura") {
      refreshRevealEls();
      scheduleRevealUpdate();
    }
  }, 350);

  document.removeEventListener("keydown", morphKeydown);
}

function outsideMorphClick(e) {
  if (!activeChannelMorph) return;
  if (!activeChannelMorph.contains(e.target)) {
    closeChannelMorph();
  }
}

function morphKeydown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    closeChannelMorph();
  }
}

async function selectChannel(rowIdx, channelKey) {
  if (!kitChannelAssignments[currentKit]) kitChannelAssignments[currentKit] = {};
  if (!kitChannelAssignments[currentKit][currentBank]) kitChannelAssignments[currentKit][currentBank] = {};
  kitChannelAssignments[currentKit][currentBank][rowIdx] = channelKey;

  const channel = getActiveChannel(rowIdx);

  // Update label immediately on selection, without waiting for audio load
  // or the morph menu to close.
  const label = trackLabels[rowIdx];
  if (label) label.textContent = channel.label;

  await ensureAudio();
  await loadChannelBuffers(channel);

  const newMaxLayer = Math.max(1, Array.isArray(channel.samples) ? channel.samples.length : 1);

  // 截断当前所有 bank 中该行的层数，避免超出新通道最大层
  for (let bank = 0; bank < BANKS; bank++) {
    bankStates[bank][rowIdx] = bankStates[bank][rowIdx].map((layer) =>
      layer > 0 ? Math.min(layer, newMaxLayer) : 0
    );
  }

  syncDomToBank();
  buildTrackVolumes();
  updateVisualization();
  refreshSelectedCenters();
  scheduleRevealUpdate();
}

function buildTrackVolumes() {
  const container = document.getElementById("trackVolumes");
  if (!container) return;
  container.innerHTML = "";
  instruments.forEach((name, i) => {
    const channel = getActiveChannel(i);
    const label = channel.label;
    const mixer = document.createElement("div");
    mixer.className = "track-mixer";
    mixer.style.setProperty("--i", i);
    mixer.dataset.index = i;

    const track = document.createElement("div");
    track.className = "vol-track";
    track.dataset.index = i;

    const bar = document.createElement("div");
    bar.className = "vol-bar";

    const fill = document.createElement("div");
    fill.className = "vol-fill";
    bar.appendChild(fill);

    const thumb = document.createElement("div");
    thumb.className = "vol-thumb";
    track.appendChild(bar);
    track.appendChild(thumb);

    updateVolTrack(track, trackVolumes[i]);

    track.addEventListener("mousedown", startVolDrag);
    track.addEventListener("touchstart", startVolDrag, { passive: false });

    const actions = document.createElement("div");
    actions.className = "track-actions";

    const muteBtn = document.createElement("button");
    muteBtn.className = "track-btn mute-btn";
    muteBtn.type = "button";
    muteBtn.textContent = "M";
    muteBtn.dataset.index = i;
    muteBtn.setAttribute("aria-label", `静音 ${label}`);
    muteBtn.addEventListener("click", () => toggleTrackMute(i));

    const soloBtn = document.createElement("button");
    soloBtn.className = "track-btn solo-btn";
    soloBtn.type = "button";
    soloBtn.textContent = "S";
    soloBtn.dataset.index = i;
    soloBtn.setAttribute("aria-label", `独奏 ${label}`);
    soloBtn.addEventListener("click", () => toggleTrackSolo(i));

    actions.appendChild(muteBtn);
    actions.appendChild(soloBtn);

    mixer.appendChild(track);
    mixer.appendChild(actions);
    container.appendChild(mixer);

    updateTrackMixerUI(i);
  });

  appendTimeSignature(container);
}

function appendTimeSignature(container) {
  if (!container) return;
  if (container.querySelector(".time-sig")) return;

  // 拍号控制暂时隐藏，保留 DOM 以便后续恢复
  const timeSig = document.createElement("div");
  timeSig.className = "time-sig";
  timeSig.id = "timeSig";
  timeSig.style.display = "none";
  timeSig.title = "点击数字修改拍号";
  timeSig.innerHTML = `
    <input type="number" class="time-sig-top" min="1" max="16" value="${timeSignature.top}" aria-label="拍号分子">
    <span class="time-sig-slash">/</span>
    <input type="number" class="time-sig-bottom" min="1" max="16" value="${timeSignature.bottom}" aria-label="拍号分母">
  `;
  container.appendChild(timeSig);
}

function toggleTrackMute(i) {
  mutedTracks[i] = !mutedTracks[i];
  updateTrackMixerUI(i);
  refreshSelectedCenters();
}

function toggleTrackSolo(i) {
  soloTracks[i] = !soloTracks[i];
  instruments.forEach((_, idx) => updateTrackMixerUI(idx));
  refreshSelectedCenters();
}

function updateTrackMixerUI(i) {
  const mixer = document.querySelector(`.track-mixer[data-index="${i}"]`);
  if (!mixer) return;
  const anySolo = soloTracks.some(Boolean);
  const muteBtn = mixer.querySelector(".mute-btn");
  const soloBtn = mixer.querySelector(".solo-btn");
  const volTrack = mixer.querySelector(".vol-track");

  const isMutedBySolo = anySolo && !soloTracks[i];
  muteBtn.classList.toggle("active", mutedTracks[i] || isMutedBySolo);
  soloBtn.classList.toggle("active", soloTracks[i]);

  const dimmed = mutedTracks[i] || isMutedBySolo;
  volTrack.classList.toggle("dimmed", dimmed);
  muteBtn.disabled = isMutedBySolo;
}

function updateVolTrack(track, val) {
  const clamped = Math.max(0, Math.min(1, val));
  track.querySelector(".vol-fill").style.width = `${clamped * 100}%`;
  track.querySelector(".vol-thumb").style.setProperty("--level", `${clamped * 100}%`);
}

function setTrackVolume(i, val) {
  trackVolumes[i] = Math.max(0, Math.min(1, val));
  const track = document.querySelector(`.vol-track[data-index="${i}"]`);
  if (track) updateVolTrack(track, trackVolumes[i]);
}

let draggedVol = null;

function volRatioFromEvent(track, e) {
  const rect = track.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return (clientX - rect.left) / rect.width;
}

function startVolDrag(e) {
  const track = e.currentTarget;
  draggedVol = track;
  track.classList.add("dragging");
  const ratio = volRatioFromEvent(track, e);
  setTrackVolume(parseInt(track.dataset.index, 10), ratio);
  lastMouseX = e.touches ? e.touches[0].clientX : e.clientX;
  lastMouseY = e.touches ? e.touches[0].clientY : e.clientY;
  scheduleRevealUpdate();
}

window.addEventListener("mousemove", (e) => {
  if (!draggedVol) return;
  const ratio = volRatioFromEvent(draggedVol, e);
  setTrackVolume(parseInt(draggedVol.dataset.index, 10), ratio);
});

window.addEventListener("mouseup", () => {
  if (draggedVol) draggedVol.classList.remove("dragging");
  draggedVol = null;
  if (lightingTier === "reduced") refreshSelectedCenters();
});

window.addEventListener(
  "touchmove",
  (e) => {
    if (!draggedVol) return;
    const ratio = volRatioFromEvent(draggedVol, e);
    setTrackVolume(parseInt(draggedVol.dataset.index, 10), ratio);
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  if (draggedVol) draggedVol.classList.remove("dragging");
  draggedVol = null;
  if (lightingTier === "reduced") refreshSelectedCenters();
});

function updatePlayhead() {
  playheadBar.style.width = "calc((100% - 120px) / 16)";
  playheadBar.style.left = `calc(${currentStep} * ((100% - 120px) / 16 + 8px))`;
}

let prevStep = -1;

	function highlightStep(step) {
	  // 仅更新变化的列，避免遍历全部 128 个 pad
	  if (prevStep >= 0 && prevStep !== step) {
	    pads.forEach((row) => {
	      if (row[prevStep]) row[prevStep].classList.remove("current");
	    });
	  }
	  pads.forEach((row) => {
	    if (row[step]) row[step].classList.add("current");
	  });
	  prevStep = step;
	}

function getBeatConfig() {
  const { top, bottom } = timeSignature;
  const beatPositions = [0, 4, 8, 12];
  const isCompound = bottom === 8;
  const beats = beatPositions.map((step, idx) => {
    const barBeatIndex = idx % top;
    return {
      step,
      idx,
      label: (barBeatIndex + 1).toString(),
      isStrong: isCompound ? barBeatIndex === 0 : true,
    };
  });
  const beatSet = new Set(beatPositions);
  const dots = [];
  for (let s = 0; s < STEPS; s++) {
    if (!beatSet.has(s)) dots.push(s);
  }
  return { beats, dots };
}

function buildBeatMarkers() {
  beatMarkers.innerHTML = "";
  beatMarkerEls = [];

  const accentTitle = document.createElement("div");
  accentTitle.className = "accent-title";
  accentTitle.textContent = "Accent";
  beatMarkers.appendChild(accentTitle);

  for (let step = 0; step < STEPS; step++) {
    const span = document.createElement("span");
    const accentIdx = accentSteps.indexOf(step);
    if (accentIdx >= 0) {
      span.className = "beat-marker beat-number accent-number";
      span.textContent = (accentIdx + 1).toString();
    } else {
      span.className = "beat-marker beat-dot";
    }
    span.dataset.step = step;
    span.style.gridColumn = step + 2;
    beatMarkers.appendChild(span);
    beatMarkerEls.push(span);
  }

  beatNumbers = beatMarkers.querySelectorAll(".beat-number");
  beatDots = beatMarkers.querySelectorAll(".beat-dot");
}

function getTimeSigInputs() {
  const container = document.getElementById("trackVolumes");
  if (!container) return { top: null, bottom: null };
  return {
    top: container.querySelector(".time-sig-top"),
    bottom: container.querySelector(".time-sig-bottom"),
  };
}

function setTimeSignature(top, bottom) {
  const newTop = Math.max(1, Math.min(16, parseInt(top, 10) || 4));
  const newBottom = Math.max(1, Math.min(16, parseInt(bottom, 10) || 4));
  if (newTop === timeSignature.top && newBottom === timeSignature.bottom) return;
  timeSignature = { top: newTop, bottom: newBottom };
  const inputs = getTimeSigInputs();
  if (inputs.top) inputs.top.value = newTop;
  if (inputs.bottom) inputs.bottom.value = newBottom;
  buildBeatMarkers();
}

function setupTimeSignature() {
  const container = document.getElementById("trackVolumes");
  if (!container) return;
  container.addEventListener("change", (e) => {
    if (
      e.target.classList.contains("time-sig-top") ||
      e.target.classList.contains("time-sig-bottom")
    ) {
      const inputs = getTimeSigInputs();
      setTimeSignature(inputs.top?.value, inputs.bottom?.value);
    }
  });
  container.addEventListener("keydown", (e) => {
    if (
      (e.target.classList.contains("time-sig-top") ||
        e.target.classList.contains("time-sig-bottom")) &&
      e.key === "Enter"
    ) {
      e.target.blur();
    }
  });
}

function updateBeatMarkers(step) {
  // 底部标记同时作为 Accent 编辑器。
  // 重音数字动画从前一列开始，持续到后两列结束（共约 4 个 step 时长）。
  beatMarkerEls.forEach((marker) => {
    const markerStep = parseInt(marker.dataset.step, 10);
    const offset = (step - markerStep + STEPS) % STEPS;

    if (marker.classList.contains("beat-number")) {
      const isPreActive = offset === STEPS - 1;
      const isPostActive = offset >= 0 && offset <= 1;
      const shouldActive = isPreActive || isPostActive;

      if (shouldActive) {
        marker.classList.add("active");
        marker.classList.remove("beat-leave", "beat-leave-no-glow");
      } else if (marker.classList.contains("active")) {
        marker.classList.remove("active");
        marker.classList.remove("beat-leave", "beat-leave-no-glow");
        const leaveClass = lightingEnabled ? "beat-leave" : "beat-leave-no-glow";
        marker.classList.add(leaveClass);
        const onEnd = (e) => {
          if (e.animationName === leaveClass) {
            marker.classList.remove(leaveClass);
            marker.removeEventListener("animationend", onEnd);
          }
        };
        marker.addEventListener("animationend", onEnd);
      }
    } else {
      marker.classList.toggle("active", markerStep === step);
    }
  });
}

function pulseMotion() {
  if (lightingScheme !== 'aura' || !lightingEnabled) return;
  // Mobile devices skip the motion-layer pulse to avoid frame drops.
  if (pointerCoarse || lightingTier === "minimal") return;
  motionLayer.classList.add("on");
  setTimeout(() => motionLayer.classList.remove("on"), 90);
}

function triggerAccentPadHit(step) {
  if (lightingScheme !== 'aura' || !lightingEnabled) return;
  if (!accentSteps.includes(step)) return;
  const duration = (0.5 * 60000) / bpm;

  // Fast path: only need to know whether any non-empty pad exists in the grid.
  let hasAny = false;
  for (let r = 0; r < pads.length; r++) {
    const rowState = bankStates[currentBank][r];
    for (let c = 0; c < rowState.length; c++) {
      if (pads[r][c] && rowState[c] > 0) {
        hasAny = true;
        break;
      }
    }
    if (hasAny) break;
  }
  if (!hasAny) return;

  // Mobile keeps only static highlights; skip the dynamic accent flash to avoid frame drops.
  if (!pointerCoarse) {
    animateAccentGlow(duration);
    refreshSelectedCenters();
    scheduleRevealUpdate();
  }
}

function tick() {
  currentStep = (currentStep + 1) % STEPS;
  if (currentStep === 0) advanceBank();
  highlightStep(currentStep);
  updatePlayhead();
  updateVisualization();
  updateBeatMarkers(currentStep);
  // pad 爆发光效提前一列触发，与底部重音数字同时出现、同时到达峰值
  triggerAccentPadHit((currentStep + 1) % STEPS);
  pulseMotion();
  playStep(currentStep);
}

async function start() {
  if (isPlaying || isLoadingAudio) return;
  await ensureAudio();
  if (isPlaying || isLoadingAudio) return;
  isPlaying = true;
  playBtn.classList.add("playing");
  appEl.classList.add("is-playing");
  playheadBar.classList.add("on");
  refreshSelectedCenters();
  scheduleRevealUpdate();
  triggerAccentPadHit((currentStep + 1) % STEPS);
  tick();
  schedule();
}

function stop() {
	  isPlaying = false;
	  prevStep = -1;
	  playBtn.classList.remove("playing");
  appEl.classList.remove("is-playing");
  playheadBar.classList.remove("on");
  pads.forEach((row) => {
    row.forEach((pad) => pad && pad.classList.remove("current"));
  });
  // 暂停时保留底部重音点/数字的当前样式，不触发离开动画
  sequencer.classList.remove("accent-hit-active");
  stopAccentGlow();
  if (accentHitTimer) {
    clearTimeout(accentHitTimer);
    accentHitTimer = null;
  }
  document.querySelectorAll(".pad.accent-hit").forEach((pad) => pad.classList.remove("accent-hit"));
  // 暂停时不重新扫描全部 active 元素，只剔除已失效的光源，防止新光源在暂停瞬间造成闪光
  pruneSelectedCenters();
  scheduleRevealUpdate();
  if (timer) clearTimeout(timer);
  timer = null;
  perfFrameSamples = [];
  perfLastFrameTime = 0;
}

function schedule() {
  if (!isPlaying) return;
  const interval = 60000 / bpm / 4;
  timer = setTimeout(() => {
    tick();
    schedule();
  }, interval);
}

playBtn.addEventListener("click", () => {
  if (isLoadingAudio) return;
  if (isPlaying) stop();
  else start();
});

if (restartBtn) {
  restartBtn.addEventListener("click", async () => {
    await ensureAudio();
    if (timer) clearTimeout(timer);
    currentStep = STEPS - 1;
    if (!isPlaying) {
      start();
    } else {
      triggerAccentPadHit((currentStep + 1) % STEPS);
      tick();
      schedule();
    }
  });
}

function jumpToStep(step) {
  currentStep = ((step % STEPS) + STEPS) % STEPS;
  highlightStep(currentStep);
  updatePlayhead();
  updateBeatMarkers(currentStep);
  updateVisualization();
  if (isPlaying) {
    if (timer) clearTimeout(timer);
    playStep(currentStep);
    schedule();
  }
}

beatMarkers.addEventListener("click", (e) => {
  const marker = e.target.closest(".beat-marker");
  if (!marker) return;
  const step = parseInt(marker.dataset.step, 10);
  if (Number.isNaN(step)) return;
  const idx = accentSteps.indexOf(step);
  if (idx >= 0) {
    accentSteps.splice(idx, 1);
  } else {
    // 按位置插入，保证左侧编号始终小于右侧
    const insertIdx = accentSteps.findIndex((s) => s > step);
    if (insertIdx === -1) accentSteps.push(step);
    else accentSteps.splice(insertIdx, 0, step);
  }
  buildBeatMarkers();
});

function clearAll() {
  bankStates = Array.from({ length: BANKS }, () =>
    instruments.map(() => Array(STEPS).fill(0))
  );
  accentSteps = [];
  buildBeatMarkers();
  syncDomToBank();
  updateVisualization();
  refreshSelectedCenters();
  scheduleRevealUpdate();
}

function openClearConfirm() {
  if (clearConfirmModal) clearConfirmModal.hidden = false;
}

function closeClearConfirm() {
  if (clearConfirmModal) clearConfirmModal.hidden = true;
}

if (clearBtn) {
  clearBtn.addEventListener("click", openClearConfirm);
}

if (confirmClearBtn) {
  confirmClearBtn.addEventListener("click", () => {
    clearAll();
    closeClearConfirm();
  });
}

if (cancelClearBtn) {
  cancelClearBtn.addEventListener("click", closeClearConfirm);
}

if (clearConfirmModal) {
  clearConfirmModal.addEventListener("click", (e) => {
    if (e.target === clearConfirmModal || e.target.classList.contains("confirm-modal-backdrop")) {
      closeClearConfirm();
    }
  });
}

function formatRecordTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}：${ss}`;
}

function renderRecordTimer(totalSeconds, animate = true) {
  if (!recordTimerDigits) return;
  const text = formatRecordTime(totalSeconds);
  const chars = text.split("");
  const html = chars
    .map((ch, i) => {
      const stagger = ch === "：" ? ' data-stagger="1"' : "";
      return `<span class="t-digit"${stagger}>${ch}</span>`;
    })
    .join("");
  recordTimerDigits.innerHTML = html;
  if (!animate) {
    recordTimerDigits.classList.add("is-animating");
    return;
  }
  recordTimerDigits.classList.remove("is-animating");
  requestAnimationFrame(() => {
    void recordTimerDigits.offsetWidth;
    recordTimerDigits.classList.add("is-animating");
  });
}

function updateRecordTimer() {
  if (!isRecording) return;
  const elapsed = Math.floor((performance.now() - recordStartTime) / 1000);
  if (elapsed !== lastRecordSeconds) {
    lastRecordSeconds = elapsed;
    renderRecordTimer(elapsed);
  }
  recordRaf = requestAnimationFrame(updateRecordTimer);
}

function floatTo16BitPCM(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

function concatFloat32Buffers(buffers) {
  let length = 0;
  buffers.forEach((b) => (length += b.length));
  const result = new Float32Array(length);
  let offset = 0;
  buffers.forEach((b) => {
    result.set(b, offset);
    offset += b.length;
  });
  return result;
}

function encodeMp3(left, right, sampleRate) {
  const kbps = 192;
  const channels = right ? 2 : 1;
  const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
  const blockSize = 1152;
  const mp3Data = [];
  for (let i = 0; i < left.length; i += blockSize) {
    const len = Math.min(blockSize, left.length - i);
    const l = floatTo16BitPCM(left.subarray(i, i + len));
    const r = right ? floatTo16BitPCM(right.subarray(i, i + len)) : l;
    const buf = channels === 2 ? encoder.encodeBuffer(l, r) : encoder.encodeBuffer(l);
    if (buf.length > 0) mp3Data.push(new Int8Array(buf));
  }
  const end = encoder.flush();
  if (end.length > 0) mp3Data.push(new Int8Array(end));
  return new Blob(mp3Data, { type: "audio/mp3" });
}

function downloadRecording(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const ext = blob.type.includes("mp3") ? "mp3" : "webm";
  a.download = `fourfour-recording-${hh}${mm}${ss}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function startRecording() {
  if (isRecording) return;
  await ensureAudio();
  if (!audioCtx || !masterOut || typeof lamejs === "undefined") {
    console.warn("无法启动录制");
    return;
  }
  recordedBuffersL = [];
  recordedBuffersR = [];
  scriptProcessor = audioCtx.createScriptProcessor(4096, 2, 2);
  scriptProcessor.onaudioprocess = (e) => {
    if (!isRecording) return;
    recordedBuffersL.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    const right = e.inputBuffer.getChannelData(1);
    recordedBuffersR.push(new Float32Array(right));
  };
  const silentGain = audioCtx.createGain();
  silentGain.gain.value = 0;
  masterOut.connect(scriptProcessor);
  scriptProcessor.connect(silentGain);
  silentGain.connect(audioCtx.destination);
  isRecording = true;
  recordStartTime = performance.now();
  lastRecordSeconds = -1;
  if (recordBtn) recordBtn.classList.add("recording");
  if (recordTimer) recordTimer.hidden = false;
  renderRecordTimer(0);
  recordRaf = requestAnimationFrame(updateRecordTimer);
}

function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  if (recordRaf) {
    cancelAnimationFrame(recordRaf);
    recordRaf = null;
  }
  if (recordBtn) recordBtn.classList.remove("recording");
  if (recordTimer) recordTimer.hidden = true;
  lastRecordSeconds = -1;
  if (scriptProcessor) {
    scriptProcessor.onaudioprocess = null;
    try { scriptProcessor.disconnect(); } catch {}
    scriptProcessor = null;
  }
  if (recordedBuffersL.length === 0) return;
  const left = concatFloat32Buffers(recordedBuffersL);
  const right = recordedBuffersR.length > 0 ? concatFloat32Buffers(recordedBuffersR) : null;
  const blob = encodeMp3(left, right, audioCtx.sampleRate);
  downloadRecording(blob);
  recordedBuffersL = [];
  recordedBuffersR = [];
}

if (recordBtn) {
  recordBtn.addEventListener("click", () => {
    if (isRecording) stopRecording();
    else startRecording();
  });
}

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && !(e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement)) {
    e.preventDefault();
    if (isPlaying) stop();
    else start();
  }
  if (e.code === "KeyM" && !(e.target instanceof HTMLInputElement)) {
    e.preventDefault();
    toggleMute();
  }
});

function resetTopBpmPopped() {
  if (!topBpm) return;
  topBpm.querySelectorAll(".step-btn").forEach((btn) => {
    btn.classList.remove("popped");
    btn.style.animation = "";
  });
}

[topBpmMinus, topBpmPlus].forEach((btn) => {
  if (!btn) return;
  btn.addEventListener("animationend", (e) => {
    if (e.animationName === "bpm-btn-pop") {
      btn.style.animation = "none";
      btn.classList.add("popped");
    }
  });
});

let panelRevealAnimation = null;

function stopPanelRevealAnimation() {
  if (panelRevealAnimation) {
    cancelAnimationFrame(panelRevealAnimation);
    panelRevealAnimation = null;
  }
}

if (panelToggle) {
  panelToggle.addEventListener("click", () => {
    appEl.classList.add("animate-settings");
    const isCollapsed = appEl.classList.contains("collapsed");
    if (isCollapsed) {
      // 展开面板：同步开始 BPM 消失动画与设置面板展开
      clearTimeout(settleTimeout);
      if (topBpm) topBpm.classList.remove("settled");
      resetTopBpmPopped();
      if (topBpm) topBpm.classList.add("leaving");
      appEl.classList.remove("collapsed");
      panelToggle.setAttribute("aria-label", "收起设置");
      setTimeout(() => {
        if (topBpm) topBpm.classList.remove("leaving");
      }, 700);
    } else {
      // 收起面板：直接触发 BPM 出现动画
      clearTimeout(settleTimeout);
      resetTopBpmPopped();
      if (topBpm) topBpm.classList.remove("leaving");
      appEl.classList.add("collapsed");
      panelToggle.setAttribute("aria-label", "展开设置");
      settleTimeout = setTimeout(() => {
        if (topBpm) topBpm.classList.add("settled");
      }, 1000);
    }
    // 动画期间持续刷新位置与高亮，避免 pad 移动和高光脱节；限制 30fps 降低重排开销
    stopPanelRevealAnimation();
    const animStart = performance.now();
    const animDuration = 700;
    let lastAnimFrame = 0;
    function animateRevealHighlights(now) {
      if (now - lastAnimFrame >= 33) {
        lastAnimFrame = now;
        // reduced/minimal 不需要动画期间逐帧重算，伪元素会跟随父元素移动
        if (lightingScheme === 'aura' && lightingTier === "full") {
          refreshRevealEls();
          updateRevealHighlights();
        }
      }
      if (now - animStart < animDuration) {
        panelRevealAnimation = requestAnimationFrame(animateRevealHighlights);
      } else {
        panelRevealAnimation = null;
      }
    }
    panelRevealAnimation = requestAnimationFrame(animateRevealHighlights);
    // 面板展开/收起动画结束后刷新元素位置缓存
    setTimeout(() => {
      refreshRevealEls();
      resizeGlowCanvas();
      cacheGlowPadRects();
    }, 700);
  });
}

function updateMasterVolUI() {
  const pct = volume * 100;
  volumeSlider.setAttribute("aria-valuenow", Math.round(pct));
  volumeSlider.querySelector(".vol-fill").style.width = `${pct}%`;
  volumeSlider.querySelector(".vol-thumb").style.setProperty("--level", `${pct}%`);

  // Apple-style dynamic volume icon: more arcs as volume increases
  volumeControl.classList.remove("level-0", "level-1", "level-2", "level-3");
  let levelClass = "level-0";
  if (pct > 70) levelClass = "level-3";
  else if (pct > 40) levelClass = "level-2";
  else if (pct > 10) levelClass = "level-1";
  volumeControl.classList.add(levelClass);
}

function setVolume(val) {
  volume = Math.max(0, Math.min(1, val));
  updateMasterVolUI();
  if (volume === 0) {
    isMuted = true;
    volumeControl.classList.add("muted");
  } else {
    isMuted = false;
    volumeControl.classList.remove("muted");
    volumeBeforeMute = volume;
  }
}

function toggleMute() {
  if (isMuted) {
    setVolume(volumeBeforeMute || 0.8);
  } else {
    volumeBeforeMute = volume || 0.8;
    setVolume(0);
  }
}

let draggedMasterVol = false;

function masterVolRatioFromEvent(e) {
  const rect = volumeSlider.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  return (clientX - rect.left) / rect.width;
}

function startMasterVolDrag(e) {
  draggedMasterVol = true;
  volumeSlider.classList.add("dragging");
  setVolume(masterVolRatioFromEvent(e));
  lastMouseX = e.touches ? e.touches[0].clientX : e.clientX;
  lastMouseY = e.touches ? e.touches[0].clientY : e.clientY;
  scheduleRevealUpdate();
}

if (volumeSlider) {
  volumeSlider.addEventListener("mousedown", startMasterVolDrag);
  volumeSlider.addEventListener("touchstart", startMasterVolDrag, { passive: false });

  volumeSlider.addEventListener("keydown", (e) => {
    const step = 0.05;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setVolume(volume - step);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setVolume(volume + step);
    } else if (e.key === "Home") {
      e.preventDefault();
      setVolume(1);
    } else if (e.key === "End") {
      e.preventDefault();
      setVolume(0);
    }
  });
}

window.addEventListener("mousemove", (e) => {
  if (!draggedMasterVol) return;
  setVolume(masterVolRatioFromEvent(e));
});

window.addEventListener("mouseup", () => {
  draggedMasterVol = false;
  if (volumeSlider) volumeSlider.classList.remove("dragging");
  if (lightingTier === "reduced") refreshSelectedCenters();
});

window.addEventListener(
  "touchmove",
  (e) => {
    if (!draggedMasterVol) return;
    setVolume(masterVolRatioFromEvent(e));
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  draggedMasterVol = false;
  if (volumeSlider) volumeSlider.classList.remove("dragging");
  if (lightingTier === "reduced") refreshSelectedCenters();
});

if (volumeIconBtn) {
  volumeIconBtn.addEventListener("click", toggleMute);
}

/* ---------- Reveal Highlight：按距离弥散到周围按钮 ---------- */
// 移动端只让核心交互元素参与 Reveal，减少事件触发时的计算量
const revealSelectors = pointerCoarse
  ? ".pad, .chip, .play-btn, .bank-btn, .vol-bar"
  : ".pad, .chip, .step-btn, .play-btn, .panel-toggle, .toggle, .bank-btn, .vol-bar, .morph-menu";
let revealEls = [];
let revealItems = []; // 缓存元素中心点，避免 mousemove 时强制重排
let revealRaf = null;
let lastMouseX = -9999;
let lastMouseY = -9999;
let lastHighlightFrame = 0;
let selectedCenters = []; // 已选中按钮（active pad / 播放中按钮 / active chip / active bank）的中心点
let revealMaxDist = 220; // 高亮影响距离，随 pad 间距动态缩放
const revealFrameBudget = pointerCoarse ? 45 : 30; // 移动 full 约 22fps，桌面 33fps

// ---------- 运行时帧率守护：full / reduced 档播放时若 sustained 掉帧则自动降级 ----------
let perfFrameSamples = [];
let perfLastFrameTime = 0;

function shouldRecordFramePerf() {
  if (!isPlaying || !pointerCoarse) return false;
  return lightingTier === "full" || lightingTier === "reduced";
}

function recordFramePerformance(now) {
  if (!shouldRecordFramePerf()) return;
  if (perfLastFrameTime) {
    perfFrameSamples.push(now - perfLastFrameTime);
    if (perfFrameSamples.length >= 60) {
      const avg = perfFrameSamples.reduce((a, b) => a + b, 0) / perfFrameSamples.length;
      perfFrameSamples = [];
      if (avg > 45) {
        downgradeLightingTier();
      }
    }
  }
  perfLastFrameTime = now;
}

function downgradeLightingTier() {
  if (!appEl || lightingTier === "minimal") return;
  const nextTier = lightingTier === "full" ? "reduced" : "minimal";
  appEl.classList.remove(`tier-${lightingTier}`);
  appEl.classList.add(`tier-${nextTier}`);
  lightingTier = nextTier;
  if (revealRaf) {
    cancelAnimationFrame(revealRaf);
    revealRaf = null;
  }
  refreshRevealEls();
  refreshSelectedCenters();
}

function refreshRevealEls() {
	  if (lightingScheme !== 'aura') {
	    revealEls = [];
	    revealItems = [];
	    return;
	  }
	  // 低性能设备跳过元素位置缓存
	  if (lightingTier === "minimal") {
	    revealEls = [];
	    revealItems = [];
	    return;
	  }
	  const isCollapsed = appEl && appEl.classList.contains("collapsed");
  const settingsEl = document.querySelector(".settings");
  revealEls = Array.from(document.querySelectorAll(revealSelectors)).filter((el) => {
    // 收起设置面板时，面板内部元素已隐藏，不应再参与 Reveal Highlight 计算
    if (isCollapsed && settingsEl && settingsEl.contains(el)) return false;
    return true;
  });
  let firstPad = null;
  let secondPad = null;
  revealItems = revealEls.map((el) => {
    const rect = el.getBoundingClientRect();
    const item = {
      el,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
    };
    if (el.classList.contains("pad") && (!firstPad || !secondPad)) {
      if (!firstPad) firstPad = item;
      else if (!secondPad) secondPad = item;
    }
    return item;
  });
  if (firstPad && secondPad) {
    const spacing = Math.hypot(secondPad.cx - firstPad.cx, secondPad.cy - firstPad.cy);
    revealMaxDist = Math.max(120, spacing * 4.5);
  } else {
    revealMaxDist = 220;
  }
  refreshSelectedCenters();
}

function applyStaticRevealHighlights() {
  if (lightingScheme !== 'aura') return;
  // 为 reduced 设备预置静态高光：激活元素照亮周围元素，视觉接近桌面 Reveal
  if (!revealItems.length) return;

  const maxDist = revealMaxDist;
  // 每个元素最多受 N 个最近光源影响；其余光源忽略，避免远距离弱光源堆积计算
  const MAX_SOURCES_PER_ITEM = pointerCoarse ? 3 : 5;
  // 移动端进一步缩小影响距离，只照亮紧邻元素（约 2 个 pad 间隔）
  const distanceCap = pointerCoarse ? maxDist * 0.45 : maxDist;

  revealItems.forEach((item) => {
    const nearby = [];

    selectedCenters.forEach((center) => {
      if (center.el === item.el) return;
      const dx = center.cx - item.cx;
      const dy = center.cy - item.cy;
      const dist = Math.hypot(dx, dy);
      const ratio = center.layerRatio ?? 1;
      const sourceMaxDist = (center.isSmallBtn ? distanceCap * 0.5 : distanceCap) * ratio;
      if (dist < sourceMaxDist && dist > 0) {
        nearby.push({ center, dx, dy, dist, sourceMaxDist });
      }
    });

    // 只取最近的光源，忽略远处的
    nearby.sort((a, b) => a.dist - b.dist);
    const limited = nearby.slice(0, MAX_SOURCES_PER_ITEM);

    if (limited.length === 0) {
      item.el.style.setProperty("--h-opacity", "0");
      return;
    }

    const strokeSources = limited.map(({ center, dx, dy, dist, sourceMaxDist }) => {
      const ratio = center.layerRatio ?? 1;
      const weightMul = (center.isSmallBtn ? 0.5 : 1) * ratio;
      const w = Math.max(0, 1 - dist / sourceMaxDist) * weightMul;
      const angle = Math.atan2(dy, dx);
      return { w, angle, dist };
    });

    const isVolBar = item.el.classList.contains("vol-bar");
    const stroke = isVolBar
      ? buildVolBarGradient(strokeSources, 0, item.width)
      : buildRevealGradient(strokeSources, 0);
    item.el.style.setProperty("--h-opacity", Math.min(1, stroke.maxIntensity).toFixed(3));
    item.el.style.setProperty("--h-grad", stroke.gradient);
  });

  selectedCenters.forEach((center) => {
    // Active pads already have their own white glow; don't add a static Reveal
    // stroke on top, or they look permanently hovered on initial load.
    const opacity = center.el.classList.contains("pad") ? "0" : "0.7";
    center.el.style.setProperty("--h-opacity", opacity);
    center.el.style.setProperty("--h-grad", conicGrad(0));
  });
}

function refreshSelectedCenters() {
  if (lightingScheme !== 'aura') {
    selectedCenters = [];
    return;
  }
  // 低性能设备跳过 Reveal 计算
  if (lightingTier === "minimal") {
    selectedCenters = [];
    return;
  }
  selectedCenters = [];
  const isCollapsed = appEl && appEl.classList.contains("collapsed");
  const settingsEl = document.querySelector(".settings");
  document.querySelectorAll(".pad.active, .play-btn.playing, .chip.active, .bank-btn.active, .track-btn.active").forEach((el) => {
    if (isCollapsed && settingsEl && settingsEl.contains(el)) return;
    const rect = el.getBoundingClientRect();
    const isPad = el.classList.contains("pad");
    selectedCenters.push({
      el,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      isPad,
      isSmallBtn: el.classList.contains("track-btn"),
      layerRatio: isPad
        ? (parseFloat(el.style.getPropertyValue("--layer-ratio")) || 1) *
          (el.classList.contains("accent-hit")
            ? (parseInt(el.dataset.row, 10) === 0 ? 1.3 : 1.1)
            : 1)
        : 1,
    });
  });
  if (lightingTier === "reduced") {
    applyStaticRevealHighlights();
  } else {
    updateRevealHighlights();
  }
}

// 暂停时只移除失效的光源（如播放按钮），不重新扫描所有 active 元素，
// 避免新光源在暂停瞬间让周围按钮出现突兀的高光闪烁。
function pruneSelectedCenters() {
  if (lightingScheme !== 'aura') {
    selectedCenters = [];
    return;
  }
  if (lightingTier === "minimal") {
    selectedCenters = [];
    return;
  }
  const isCollapsed = appEl && appEl.classList.contains("collapsed");
  const settingsEl = document.querySelector(".settings");
  selectedCenters = selectedCenters
    .filter((center) => {
      const el = center.el;
      if (!el.isConnected) return false;
      if (isCollapsed && settingsEl && settingsEl.contains(el)) return false;
      return el.matches(".pad.active, .play-btn.playing, .chip.active, .bank-btn.active, .track-btn.active");
    })
    .map((center) => {
      const el = center.el;
      const rect = el.getBoundingClientRect();
      const isPad = el.classList.contains("pad");
      return {
        el,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        isPad,
        isSmallBtn: el.classList.contains("track-btn"),
        layerRatio: isPad
          ? (parseFloat(el.style.getPropertyValue("--layer-ratio")) || 1) *
            (el.classList.contains("accent-hit")
              ? (parseInt(el.dataset.row, 10) === 0 ? 1.3 : 1.1)
              : 1)
          : 1,
      };
    });
  if (lightingTier === "reduced") {
    applyStaticRevealHighlights();
  } else {
    updateRevealHighlights();
  }
}

function conicGrad(angle) {
  return `conic-gradient(from ${angle}deg at 50% 50%, rgba(255, 255, 255, 0.95) 0deg, rgba(255, 255, 255, 0.55) 45deg, transparent 90deg, transparent 270deg, rgba(255, 255, 255, 0.55) 315deg, rgba(255, 255, 255, 0.95) 360deg)`;
}

// 根据所有光源方向构建一个 conic-gradient，让被照亮的边框每一段亮度都随光源方向和距离变化
// baseAlpha 为整个环提供最低亮度，用于 toggle 等需要完整圆环的场景
function buildRevealGradient(sources, baseAlpha = 0) {
  const hasSources = sources.length > 0;
  if (!hasSources && baseAlpha <= 0) return { gradient: conicGrad(0), maxIntensity: 0 };

  const steps = 24;
  const stepDeg = 360 / steps;
  const samples = [];
  let maxSourceI = 0;

  for (let i = 0; i < steps; i++) {
    const deg = i * stepDeg;
    let sourceIntensity = 0;
    sources.forEach((src) => {
      const srcCssDeg = src.angle * (180 / Math.PI) + 90;
      let diff = Math.abs(deg - srcCssDeg);
      while (diff > 180) diff = 360 - diff;
      const falloff = Math.max(0, Math.cos(diff * (Math.PI / 180)));
      sourceIntensity += src.w * Math.pow(falloff, 3);
    });
    sourceIntensity = Math.min(1, sourceIntensity);
    samples.push(sourceIntensity);
    maxSourceI = Math.max(maxSourceI, sourceIntensity);
  }

  const peakAlpha = 0.95;
  const stops = [];
  for (let i = 0; i <= steps; i++) {
    const idx = i % steps;
    const deg = i * stepDeg;
    const alpha = Math.min(peakAlpha, baseAlpha + samples[idx] * (peakAlpha - baseAlpha));
    stops.push(`rgba(255, 255, 255, ${alpha.toFixed(3)}) ${deg.toFixed(1)}deg`);
  }

  return {
    gradient: `conic-gradient(from 0deg at 50% 50%, ${stops.join(", ")})`,
    maxIntensity: baseAlpha + maxSourceI * (peakAlpha - baseAlpha),
  };
}

// 为细长条音量条构建线性渐变高光：受光点跟随光源在条上的水平投影，像聚光灯一样左右平滑移动
function buildVolBarGradient(sources, baseAlpha = 0, width = 100) {
  const peakAlpha = 0.95;

  if (!sources.length) {
    if (baseAlpha <= 0) {
      return {
        gradient: "linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0))",
        maxIntensity: 0,
      };
    }
    return {
      gradient: `linear-gradient(90deg, rgba(255, 255, 255, ${baseAlpha.toFixed(3)}), rgba(255, 255, 255, ${baseAlpha.toFixed(3)}))`,
      maxIntensity: baseAlpha,
    };
  }

  const halfW = Math.max(1, width / 2);
  const samples = 16;
  const profile = new Array(samples).fill(0);
  let maxI = 0;

  sources.forEach((src) => {
    const sx = src.dist * Math.cos(src.angle); // 光源相对条中心的水平偏移
    const sy = src.dist * Math.sin(src.angle); // 光源相对条中心的垂直偏移
    let t = (sx / halfW + 1) / 2; // 投影到条上的归一化位置 [0, 1]
    t = Math.max(0, Math.min(1, t));
    // 离条面越近光斑越集中，越远越弥散
    const sigma = Math.max(0.08, Math.min(0.45, 0.08 + Math.abs(sy) / width));

    for (let i = 0; i < samples; i++) {
      const x = i / (samples - 1);
      const d = x - t;
      const intensity = src.w * Math.exp(-(d * d) / (2 * sigma * sigma));
      profile[i] += intensity;
      maxI = Math.max(maxI, profile[i]);
    }
  });

  const stops = [];
  for (let i = 0; i < samples; i++) {
    const x = (i / (samples - 1)) * 100;
    const alpha = Math.min(peakAlpha, baseAlpha + profile[i] * (peakAlpha - baseAlpha));
    stops.push(`rgba(255, 255, 255, ${alpha.toFixed(3)}) ${x.toFixed(1)}%`);
  }

  return {
    gradient: `linear-gradient(90deg, ${stops.join(", ")})`,
    maxIntensity: Math.min(peakAlpha, baseAlpha + maxI * (peakAlpha - baseAlpha)),
  };
}

function updateRevealHighlights() {
	  revealRaf = null;
	  if (lightingScheme !== 'aura' || !lightingEnabled) {
	    revealItems.forEach((item) => item.el.style.setProperty("--h-opacity", "0"));
	    return;
	  }
	  if (!revealItems.length) return;

	  // 仅 full tier 持续计算高光；reduced 只在拖拽音量条时进入此函数
		  const isDragging = !!(draggedVol || draggedMasterVol);
		  if (lightingTier !== "full" && !isDragging) {
		    revealItems.forEach((item) => item.el.style.setProperty("--h-opacity", "0"));
		    return;
		  }

	  const maxDist = revealMaxDist;

	  const draggedVolBar = draggedVol
	    ? draggedVol.querySelector(".vol-bar")
	    : volumeSlider && volumeSlider.classList.contains("dragging")
	    ? volumeSlider.querySelector(".vol-bar")
	    : null;

	  revealItems.forEach((item) => {
	    const strokeSources = [];

	    // 鼠标作为高光源；reduced 设备仅在拖拽音量条时响应光标
		    if (lightingTier === "full" || draggedVolBar) {
      const mouseDist = Math.hypot(lastMouseX - item.cx, lastMouseY - item.cy);
      if (mouseDist < maxDist) {
        const w = Math.max(0, 1 - mouseDist / maxDist);
        const angle = Math.atan2(lastMouseY - item.cy, lastMouseX - item.cx);
        strokeSources.push({ w, angle, dist: mouseDist });
      }
    }

	    // 已选中按钮：所有非自身按钮都作为高光源；仅 full tier 动态计算
		    if (lightingTier === "full") {
	      selectedCenters.forEach((center) => {
	        if (center.el === item.el) return;
	        const dx = center.cx - item.cx;
	        const dy = center.cy - item.cy;
	        const dist = Math.hypot(dx, dy);
	        const ratio = center.layerRatio ?? 1;
	        const sourceMaxDist = (center.isSmallBtn ? maxDist * 0.5 : maxDist) * ratio;
	        const weightMul = (center.isSmallBtn ? 0.5 : 1) * ratio;
	        if (dist < sourceMaxDist && dist > 0) {
	          const w = Math.max(0, 1 - dist / sourceMaxDist) * weightMul;
	          const angle = Math.atan2(dy, dx);
	          strokeSources.push({ w, angle, dist });
	        }
	      });
	    }

	    const isToggle = item.el.classList.contains("toggle");
	    const isVolBar = item.el.classList.contains("vol-bar");
	    const baseAlpha = isToggle && strokeSources.length > 0 ? 0.28 : 0;
	    const stroke = isVolBar
	      ? buildVolBarGradient(strokeSources, baseAlpha, item.width)
	      : buildRevealGradient(strokeSources, baseAlpha);
	    item.el.style.setProperty("--h-opacity", Math.min(1, stroke.maxIntensity).toFixed(3));
    item.el.style.setProperty("--h-grad", stroke.gradient);

    if (item.el.classList.contains("morph-menu")) {
      const morphLeft = item.cx - item.width / 2;
      const morphTop = item.cy - item.height / 2;
      let rx = ((lastMouseX - morphLeft) / item.width) * 100;
      let ry = ((lastMouseY - morphTop) / item.height) * 100;
      rx = Math.max(0, Math.min(100, rx));
      ry = Math.max(0, Math.min(100, ry));
      item.el.style.setProperty(
        "--h-grad",
        `radial-gradient(circle at ${rx.toFixed(1)}% ${ry.toFixed(1)}%, rgba(255,255,255,0.85), rgba(255,255,255,0.30) 24%, transparent 48%)`
      );
    }

    if (draggedVolBar === item.el) {
	      const dx = lastMouseX - item.cx;
	      const dy = lastMouseY - item.cy;
	      const angle = Math.atan2(dy, dx);
	      const dist = Math.hypot(dx, dy);
	      const stroke = buildVolBarGradient([{ w: 1, angle, dist }], 0.45, item.width);
	      item.el.style.setProperty("--h-opacity", "1");
	      item.el.style.setProperty("--h-grad", stroke.gradient);
	    }
	  });
	}

function scheduleRevealUpdate() {
  if (lightingScheme !== 'aura') return;
  // full tier 持续调度 RAF；reduced/minimal 仅在拖拽音量条时调度
  if (lightingTier !== "full" && !draggedVol && !draggedMasterVol) return;
  if (revealRaf) return;
  revealRaf = requestAnimationFrame((now) => {
    revealRaf = null;
    if (now - lastHighlightFrame < revealFrameBudget) return;
    lastHighlightFrame = now;
    updateRevealHighlights();
    if (lightingTier === "full") recordFramePerformance(now);
  });
}

document.addEventListener("mousemove", (e) => {
  // 移动端没有精细鼠标移动，跳过追踪以避免不必要的 RAF
  if (pointerCoarse) return;
  // 仅 full tier 或拖拽音量条时追踪光标
  if (lightingTier !== "full" && !draggedVol && !draggedMasterVol) return;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  scheduleRevealUpdate();
});

document.addEventListener("mouseleave", () => {
  if (draggedVol || draggedMasterVol) return;
  lastMouseX = -9999;
  lastMouseY = -9999;
  scheduleRevealUpdate();
});

// 缓存元素位置；resize/面板动画后需要重新计算
let resizeTimeout = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (lightingScheme === 'aura') {
      refreshRevealEls();
      updateRevealHighlights();
    }
    resizeGlowCanvas();
    cacheGlowPadRects();
  }, 100);
});

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    if (lightingScheme === 'aura') {
      refreshRevealEls();
      updateRevealHighlights();
    }
    resizeGlowCanvas();
    cacheGlowPadRects();
  });
  window.visualViewport.addEventListener("scroll", () => {
    if (lightingScheme === 'aura') {
      refreshRevealEls();
      updateRevealHighlights();
    }
    resizeGlowCanvas();
    cacheGlowPadRects();
  });
}

window.addEventListener("load", () => {
  if (lightingScheme === 'aura') {
    refreshRevealEls();
    updateRevealHighlights();
  }
});
if (lightingScheme === 'aura') {
  refreshRevealEls();
  updateRevealHighlights();
}

function setBpm(next) {
  bpm = Math.max(40, Math.min(220, Math.round(next)));
  bpmValue.value = bpm;
  if (topBpmValue) topBpmValue.value = bpm;
  // 重音动画时长为 2 个 16 分音符的 70%，提前一列触发，峰值正好对齐当前播放列
  document.documentElement.style.setProperty("--beat-accent-duration", `${(0.5 * 60 * 0.7) / bpm}s`);
}

function commitBpmInput(input) {
  const val = parseInt(input.value, 10);
  if (!isNaN(val)) setBpm(val);
  else input.value = bpm;
}

[bpmValue, topBpmValue].forEach((input) => {
  if (!input) return;
  input.addEventListener("change", () => commitBpmInput(input));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur();
      commitBpmInput(input);
    }
  });
});

function setupBpmStepper(btn, delta) {
  let interval = null;
  let timeout = null;

  function start(e) {
    if (e) e.preventDefault();
    setBpm(bpm + delta);
    timeout = setTimeout(() => {
      interval = setInterval(() => setBpm(bpm + delta), 80);
    }, 350);
  }

  function end() {
    clearTimeout(timeout);
    clearInterval(interval);
  }

  btn.addEventListener("mousedown", start);
  btn.addEventListener("touchstart", start, { passive: false });
  btn.addEventListener("mouseup", end);
  btn.addEventListener("mouseleave", end);
  btn.addEventListener("touchend", end);
}

setupBpmStepper(bpmMinus, -1);
setupBpmStepper(bpmPlus, 1);
if (topBpmMinus) setupBpmStepper(topBpmMinus, -1);
if (topBpmPlus) setupBpmStepper(topBpmPlus, 1);

function setScheme(scheme) {
  if (!SCHEMES.includes(scheme)) return;
  lightingScheme = scheme;
  lightingEnabled = scheme !== 'off';
  appEl.setAttribute('data-lighting-scheme', scheme);
  appEl.classList.toggle('lighting-off', !lightingEnabled);

  schemeSelector.querySelectorAll('.scheme-option').forEach((btn) => {
    const active = btn.dataset.scheme === scheme;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  if (lightingToggle) {
    lightingToggle.checked = lightingEnabled;
  }

  if (lightingEnabled) {
    schemeBeforeOff = scheme;
  }

  if (lightingScheme !== 'aura') {
    if (revealRaf) {
      cancelAnimationFrame(revealRaf);
      revealRaf = null;
    }
    refreshSelectedCenters();
  }

  if (!lightingEnabled) {
    stopAccentGlow();
    revealItems.forEach((item) => item.el.style.setProperty("--h-opacity", "0"));
  } else if (lightingScheme === 'aura') {
    refreshRevealEls();
    refreshSelectedCenters();
    scheduleRevealUpdate();
  }
}

schemeSelector.addEventListener('click', (e) => {
  const btn = e.target.closest('.scheme-option');
  if (!btn) return;
  setScheme(btn.dataset.scheme);
});

if (lightingToggle) {
  lightingToggle.addEventListener('change', () => {
    if (lightingToggle.checked) {
      setScheme(schemeBeforeOff);
    } else {
      setScheme('off');
    }
  });
}

setScheme(lightingScheme);

async function applyPatternChannels(name) {
  const channels = patternChannels[name] ?? {};
  const kitChannels = kits[currentKit]?.channels ?? {};

  // 将当前套件中未在预设里指定的通道恢复为默认
  for (const rowIdx of Object.keys(kitChannels)) {
    const idx = parseInt(rowIdx, 10);
    if (!(rowIdx in channels)) {
      const defaultKey = kitChannels[rowIdx][0]?.key;
      if (defaultKey && getActiveChannel(idx).key !== defaultKey) {
        await selectChannel(idx, defaultKey);
      }
    }
  }

  // 应用预设指定的通道
  for (const [rowIdx, channelKey] of Object.entries(channels)) {
    const idx = parseInt(rowIdx, 10);
    if (getActiveChannel(idx).key !== channelKey) {
      await selectChannel(idx, channelKey);
    }
  }
}

function setupChips(container, isRhythm = false) {
  container.addEventListener("click", async (e) => {
    const chip = e.target.closest(".chip");
    if (!chip || chip.classList.contains("chip-add")) return;
    container.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    if (isRhythm) {
      const name = chip.textContent.trim();
      currentRhythm = name;
      // Rock 默认 110 BPM + Acoustic
      if (name === "Rock") {
        setBpm(110);
        setKit("Acoustic");
      } else if (name === "Funk") {
        setBpm(82);
        setTrackVolume(instruments.indexOf("Snare"), 0.43);
        setTrackVolume(instruments.indexOf("Kick"), 0.5);
      } else if (name === "Techno") {
        setBpm(132);
        setKit("808");
      }
      await applyPatternChannels(name);
      applyPatternAllBanks(name);
      setBank(0);
      syncDomToBank();
      updateVisualization();
      refreshRevealEls();
    } else {
      const kit = chip.textContent.trim();
      setKit(kit);
    }
    refreshSelectedCenters();
    scheduleRevealUpdate();
  });
}

function setKit(name) {
  if (!kits[name] || currentKit === name) return;
  currentKit = name;
  loadPromise = null;
  sampleBuffers = {};
  // 即使没有初始化音频，也主动创建上下文并加载新套件采样
  ensureAudio();
  updateTrackLabels();
  buildSequencer();
  buildTrackVolumes();
  syncDomToBank();
  // 未播放时切换采样不应显示进度条
  if (isPlaying) highlightStep(currentStep);
  updatePlayhead();
  refreshRevealEls();
  // 同步 Sample 选择区高亮
  document.querySelectorAll("#sampleChips .chip").forEach((c) => {
    c.classList.toggle("active", c.textContent.trim() === name);
  });
  refreshSelectedCenters();
  scheduleRevealUpdate();
}

setupChips(document.getElementById("rhythmChips"), true);
setupChips(document.getElementById("sampleChips"));

/* ---------- 节奏可视化 ---------- */
let vizBarEls = [];
let vizBarCache = [];

function buildVizGrid() {
  vizGrid.innerHTML = "";
  vizBarEls = [];
  vizBarCache = [];
  for (let i = 0; i < STEPS; i++) {
    const bar = document.createElement("div");
    bar.className = "viz-bar";
    vizGrid.appendChild(bar);
    vizBarEls.push(bar);
    vizBarCache.push(null);
  }
}

function updateVisualization() {
  vizBarEls.forEach((bar, col) => {
    const totalRatio = bankStates[currentBank].reduce((sum, row, rowIdx) => {
      const maxLayer = getMaxLayer(rowIdx);
      return sum + (maxLayer > 0 ? row[col] / maxLayer : 0);
    }, 0);
    let h = 8 + (totalRatio / instruments.length) * 72;
    if (col === currentStep) h *= 1.25;
    const scale = (Math.min(100, h) / 100).toFixed(3);
    if (vizBarCache[col] !== scale) {
      vizBarCache[col] = scale;
      bar.style.setProperty("--viz-scale", scale);
    }
  });
}

/* ---------- Smart Drums ---------- */
const sdPalette = [
  { color: "#ff5e3a", abbr: "Ki" },
  { color: "#ffd54f", abbr: "HH" },
  { color: "#ff4081", abbr: "Sn" },
  { color: "#69f0ae", abbr: "To" },
  { color: "#00e5ff", abbr: "Cr" },
  { color: "#1de9b6", abbr: "Tb" },
  { color: "#448aff", abbr: "Sh" },
  { color: "#e040fb", abbr: "Cg" },
];

const sdState = instruments.map((name, i) => ({
  name,
  ...sdPalette[i],
  x: 0.15 + Math.random() * 0.7,
  y: 0.15 + Math.random() * 0.7,
}));

let smartDrumsOn = true;
let draggedDot = null;

function buildSmartDrums() {
  sdState.forEach((inst) => {
    const dot = document.createElement("div");
    dot.className = "sd-dot";
    dot.textContent = inst.abbr;
    dot.dataset.name = inst.name;
    dot.style.setProperty("--sd-color", inst.color);
    dot.addEventListener("mousedown", (e) => startDragDot(e, dot));
    dot.addEventListener(
      "touchstart",
      (e) => {
        startDragDot(e, dot);
        e.preventDefault();
      },
      { passive: false }
    );
    dot.addEventListener("click", () => ensureAudio().then(() => playInstrument(inst.name)));
    sdPad.appendChild(dot);
    moveDot(dot, inst.x, inst.y);
  });
}

function sdPosFromEvent(e) {
  const rect = sdPad.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
}

function clampDotPos(x, y) {
  if (!draggedDot) return { x, y };
  const rect = sdPad.getBoundingClientRect();
  const halfX = draggedDot.offsetWidth / 2 / rect.width;
  const halfY = draggedDot.offsetHeight / 2 / rect.height;
  return {
    x: Math.max(halfX, Math.min(1 - halfX, x)),
    y: Math.max(halfY, Math.min(1 - halfY, y)),
  };
}

function moveDot(dot, x, y) {
  dot.style.left = `${x * 100}%`;
  dot.style.top = `${y * 100}%`;
}

function startDragDot(e, dot) {
  draggedDot = dot;
  dot.classList.add("dragging");
  const { x, y } = clampDotPos(sdPosFromEvent(e).x, sdPosFromEvent(e).y);
  moveDot(dot, x, y);
}

window.addEventListener("mousemove", (e) => {
  if (!draggedDot) return;
  const { x, y } = clampDotPos(sdPosFromEvent(e).x, sdPosFromEvent(e).y);
  moveDot(draggedDot, x, y);
});

window.addEventListener("mouseup", () => {
  if (draggedDot) draggedDot.classList.remove("dragging");
  draggedDot = null;
});

window.addEventListener(
  "touchmove",
  (e) => {
    if (!draggedDot) return;
    const { x, y } = clampDotPos(sdPosFromEvent(e).x, sdPosFromEvent(e).y);
    moveDot(draggedDot, x, y);
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  if (draggedDot) draggedDot.classList.remove("dragging");
  draggedDot = null;
});

sdPower.addEventListener("click", () => {
  smartDrumsOn = !smartDrumsOn;
  sdPower.classList.toggle("active", smartDrumsOn);
  sdPad.classList.toggle("off", !smartDrumsOn);
});

sdDice.addEventListener("click", () => {
  const dots = [...sdPad.querySelectorAll(".sd-dot")];
  dots.forEach((dot, i) => {
    const x = 0.15 + Math.random() * 0.7;
    const y = 0.15 + Math.random() * 0.7;
    sdState[i].x = x;
    sdState[i].y = y;
    moveDot(dot, x, y);
  });
  if (smartDrumsOn) generatePatternFromSmartDrums();
});

function generatePatternFromSmartDrums() {
  bankStates[currentBank] = instruments.map((_, rowIdx) => {
    const inst = sdState[rowIdx];
    const maxLayer = getMaxLayer(rowIdx);
    const density = 0.12 + 0.6 * inst.x; // 简单 -> 复杂
    return Array.from({ length: STEPS }, (_, col) => {
      let prob = density;
      if (inst.name === "Kick" && col % 4 === 0) prob += 0.35;
      if (inst.name === "Snare" && (col === 4 || col === 12)) prob += 0.35;
      if (inst.name === "Hi-Hat" && col % 2 === 0) prob += 0.25;
      return Math.random() < Math.min(0.95, prob) ? maxLayer : 0;
    });
  });
  syncDomToBank();
  updateVisualization();
}

if (bankTabs) {
  bankTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".bank-btn");
    if (!btn) return;
    setBank(parseInt(btn.dataset.bank, 10));
  });
}

buildSequencer();
buildVizGrid();
buildSmartDrums();
buildTrackVolumes();
buildBeatMarkers();
setupTimeSignature();
updatePlayhead();
applyPatternAllBanks(currentRhythm);
syncDomToBank();
updateVisualization();
setVolume(volume);
setBpm(bpm);
