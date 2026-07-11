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
const bankTabs = document.getElementById("bankTabs");
const playBtn = document.getElementById("playBtn");
const clearBtn = document.getElementById("clearBtn");
const restartBtn = document.getElementById("restartBtn");
const bpmValue = document.getElementById("bpmValue");
const bpmMinus = document.getElementById("bpmMinus");
const bpmPlus = document.getElementById("bpmPlus");
const topBpmValue = document.getElementById("topBpmValue");
const topBpmMinus = document.getElementById("topBpmMinus");
const topBpmPlus = document.getElementById("topBpmPlus");
const topBpm = document.getElementById("topBpm");
const playheadBar = document.getElementById("playheadBar");
const motionToggle = document.getElementById("motionToggle");
const motionLayer = document.getElementById("motionLayer");
const vizGrid = document.getElementById("vizGrid");
const sdPad = document.getElementById("sdPad");
const sdPower = document.getElementById("sdPower");
const sdDice = document.getElementById("sdDice");
const appEl = document.querySelector(".app");
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
if (isTouchDevice && appEl) appEl.classList.add("touch-optimized");
const panelToggle = document.getElementById("panelToggle");
const volumeSlider = document.getElementById("volumeSlider");
const volumeIconBtn = document.getElementById("volumeIconBtn");
const volumeControl = document.getElementById("volumeControl");
let beatNumbers = document.querySelectorAll(".beat-number");
let beatDots = document.querySelectorAll(".beat-dot");
const beatMarkers = document.getElementById("beatMarkers");
const trackVolumesContainer = document.getElementById("trackVolumes");

let pads = [];
let isPlaying = false;
let isLoadingAudio = false;
let currentStep = 0;
let bpm = 110;
let timer = null;
let lightingEnabled = true;
let volume = 0.8;
let isMuted = false;
let volumeBeforeMute = 0.8;
let settleTimeout = null;
let timeSignature = { top: 4, bottom: 4 };
let accentSteps = [];
const trackVolumes = Array(instruments.length).fill(0.8);
const mutedTracks = Array(instruments.length).fill(false);
const soloTracks = Array(instruments.length).fill(false);
let kitChannelAssignments = {}; // { kitName: { rowIdx: channelKey } }

const kits = {
  Acoustic: {
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

const SAMPLE_BASE = "https://fourfour-samples-1333371641.cos.ap-guangzhou.myqcloud.com";

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
let sampleBuffers = {};
let loadPromise = null;

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
  sampleBuffers = {};
  const jobs = [];
  for (let rowIdx = 0; rowIdx < instruments.length; rowIdx++) {
    jobs.push(loadChannelBuffers(getActiveChannel(rowIdx)));
  }
  await Promise.all(jobs);
}

function getActiveChannel(rowIdx) {
  const kit = kits[currentKit];
  const channels = kit?.channels?.[rowIdx];
  const defaultKey = instruments[rowIdx];
  const defaultLabel = kit?.labels?.[rowIdx] ?? defaultKey;
  const defaultSamples = kit?.samples?.[defaultKey];
  if (!channels || channels.length === 0) {
    return { key: defaultKey, label: defaultLabel, samples: defaultSamples };
  }
  const assignedKey = kitChannelAssignments[currentKit]?.[rowIdx];
  const match = channels.find((c) => c.key === assignedKey);
  return match ?? channels[0];
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
  const isAccent = accentSteps.includes(currentStep);
  let finalGain = volume * (trackVolumes[instIdx] ?? 1) * sampleGain;
  if (isAccent) finalGain = 1;
  gain.gain.value = isAudible ? finalGain : 0;
  src.connect(gain);
  gain.connect(audioCtx.destination);
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
}

function buildSequencer() {
  sequencer.innerHTML = "";
  pads = [];
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
      openChannelDropdown(label, rowIdx);
    });
    sequencer.appendChild(label);

    const rowPads = [];
    for (let col = 0; col < STEPS; col++) {
      const pad = document.createElement("button");
      pad.className = "pad";
      pad.dataset.row = rowIdx;
      pad.dataset.col = col;
      pad.type = "button";
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
}

function updateTrackLabels() {
  document.querySelectorAll(".track-label").forEach((el) => {
    const rowIdx = parseInt(el.dataset.row, 10);
    if (Number.isNaN(rowIdx)) return;
    const channel = getActiveChannel(rowIdx);
    el.textContent = channel.label;
  });
}

let activeChannelDropdown = null;

function openChannelDropdown(labelEl, rowIdx) {
  closeChannelDropdown();
  const channels = kits[currentKit]?.channels?.[rowIdx];
  if (!channels || channels.length < 2) return;

  const dropdown = document.createElement("ul");
  dropdown.className = "channel-dropdown";
  dropdown.setAttribute("role", "listbox");
  dropdown.dataset.row = rowIdx;

  const currentKey = getActiveChannel(rowIdx).key;
  channels.forEach((channel) => {
    const item = document.createElement("li");
    item.className = "channel-option";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(channel.key === currentKey));
    item.textContent = channel.label;
    item.dataset.key = channel.key;
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      selectChannel(rowIdx, channel.key);
      closeChannelDropdown();
    });
    dropdown.appendChild(item);
  });

  document.body.appendChild(dropdown);
  activeChannelDropdown = dropdown;
  labelEl.setAttribute("aria-expanded", "true");

  positionChannelDropdown(labelEl, dropdown);

  requestAnimationFrame(() => {
    document.addEventListener("click", outsideDropdownClick, { once: true });
    document.addEventListener("keydown", dropdownKeydown);
  });
}

function positionChannelDropdown(labelEl, dropdown) {
  const rect = labelEl.getBoundingClientRect();
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.top = `${rect.bottom + 4}px`;
}

function closeChannelDropdown() {
  if (!activeChannelDropdown) return;
  const rowIdx = activeChannelDropdown.dataset.row;
  const labelEl = document.querySelector(`.track-label[data-row="${rowIdx}"]`);
  if (labelEl) labelEl.setAttribute("aria-expanded", "false");
  activeChannelDropdown.remove();
  activeChannelDropdown = null;
  document.removeEventListener("keydown", dropdownKeydown);
}

function outsideDropdownClick(e) {
  if (!activeChannelDropdown) return;
  if (!activeChannelDropdown.contains(e.target)) {
    closeChannelDropdown();
  }
}

function dropdownKeydown(e) {
  if (e.key === "Escape") {
    e.preventDefault();
    closeChannelDropdown();
  }
}

async function selectChannel(rowIdx, channelKey) {
  if (!kitChannelAssignments[currentKit]) kitChannelAssignments[currentKit] = {};
  kitChannelAssignments[currentKit][rowIdx] = channelKey;

  await ensureAudio();

  const channel = getActiveChannel(rowIdx);
  await loadChannelBuffers(channel);

  const newMaxLayer = Math.max(1, Array.isArray(channel.samples) ? channel.samples.length : 1);

  // 截断当前所有 bank 中该行的层数，避免超出新通道最大层
  for (let bank = 0; bank < BANKS; bank++) {
    bankStates[bank][rowIdx] = bankStates[bank][rowIdx].map((layer) =>
      layer > 0 ? Math.min(layer, newMaxLayer) : 0
    );
  }

  syncDomToBank();
  updateTrackLabels();
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
});

function updatePlayhead() {
  playheadBar.style.width = "calc((100% - 120px) / 16)";
  playheadBar.style.left = `calc(${currentStep} * ((100% - 120px) / 16 + 8px))`;
}

function highlightStep(step) {
  pads.forEach((row) => {
    row.forEach((pad, col) => {
      pad.classList.toggle("current", col === step);
    });
  });
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
  beatMarkers.querySelectorAll(".beat-marker").forEach((marker) => {
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
  if (!lightingEnabled) return;
  motionLayer.classList.add("on");
  setTimeout(() => motionLayer.classList.remove("on"), 90);
}

function triggerAccentPadHit(step) {
  if (!lightingEnabled) return;
  if (!accentSteps.includes(step)) return;
  const duration = (0.5 * 60000) / bpm;
  const toAnimate = [];
  pads.forEach((row, rowIdx) => {
    row.forEach((pad, col) => {
      if (!pad || bankStates[currentBank][rowIdx][col] <= 0) return;
      pad.classList.remove("accent-hit");
      toAnimate.push(pad);
    });
  });
  if (toAnimate.length === 0) return;
  void toAnimate[0].offsetWidth;
  toAnimate.forEach((pad) => pad.classList.add("accent-hit"));
  setTimeout(() => {
    toAnimate.forEach((pad) => pad.classList.remove("accent-hit"));
    refreshSelectedCenters();
    scheduleRevealUpdate();
  }, duration);
  refreshSelectedCenters();
  scheduleRevealUpdate();
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
  playBtn.classList.remove("playing");
  appEl.classList.remove("is-playing");
  playheadBar.classList.remove("on");
  beatMarkers.querySelectorAll(".beat-marker.active").forEach((marker) => {
    marker.classList.remove("active");
    marker.classList.add("beat-leave");
  });
  document.querySelectorAll(".pad.accent-hit").forEach((pad) => pad.classList.remove("accent-hit"));
  refreshSelectedCenters();
  scheduleRevealUpdate();
  if (timer) clearTimeout(timer);
  timer = null;
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

if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    bankStates = Array.from({ length: BANKS }, () =>
      instruments.map(() => Array(STEPS).fill(0))
    );
    accentSteps = [];
    buildBeatMarkers();
    syncDomToBank();
    updateVisualization();
    refreshSelectedCenters();
    scheduleRevealUpdate();
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
        refreshRevealEls();
        updateRevealHighlights();
      }
      if (now - animStart < animDuration) {
        panelRevealAnimation = requestAnimationFrame(animateRevealHighlights);
      } else {
        panelRevealAnimation = null;
      }
    }
    panelRevealAnimation = requestAnimationFrame(animateRevealHighlights);
    // 面板展开/收起动画结束后刷新元素位置缓存
    setTimeout(refreshRevealEls, 700);
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
});

if (volumeIconBtn) {
  volumeIconBtn.addEventListener("click", toggleMute);
}

/* ---------- Reveal Highlight：按距离弥散到周围按钮 ---------- */
const revealSelectors = ".pad, .chip, .step-btn, .play-btn, .panel-toggle, .toggle, .bank-btn, .vol-bar, .track-btn";
let revealEls = [];
let revealItems = []; // 缓存元素中心点，避免 mousemove 时强制重排
let revealRaf = null;
let lastMouseX = -9999;
let lastMouseY = -9999;
let lastHighlightFrame = 0;
let selectedCenters = []; // 已选中按钮（active pad / 播放中按钮 / active chip / active bank）的中心点
let revealMaxDist = 220; // 高亮影响距离，随 pad 间距动态缩放

function refreshRevealEls() {
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

function refreshSelectedCenters() {
  selectedCenters = [];
  const isCollapsed = appEl && appEl.classList.contains("collapsed");
  const settingsEl = document.querySelector(".settings");
  document.querySelectorAll(".pad.active, .play-btn.playing, .chip.active, .bank-btn.active, .track-btn.active").forEach((el) => {
    // 收起设置面板时，跳过面板内部已被隐藏的光源，避免其继续影响外部元素
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
  updateRevealHighlights();
}

function conicGrad(angle) {
  return `conic-gradient(from ${angle}deg at 50% 50%, rgba(255, 255, 255, 0.95) 0deg, rgba(255, 255, 255, 0.55) 45deg, transparent 90deg, transparent 270deg, rgba(255, 255, 255, 0.55) 315deg, rgba(255, 255, 255, 0.95) 360deg)`;
}

// 根据所有光源方向构建一个 conic-gradient，让被照亮的边框每一段亮度都随光源方向和距离变化
// baseAlpha 为整个环提供最低亮度，用于 toggle 等需要完整圆环的场景
function buildRevealGradient(sources, baseAlpha = 0) {
  const hasSources = sources.length > 0;
  if (!hasSources && baseAlpha <= 0) return { gradient: conicGrad(0), maxIntensity: 0 };

  const steps = isTouchDevice ? 12 : 24;
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

  const peakAlpha = isTouchDevice ? 0.75 : 0.95;
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
  const peakAlpha = isTouchDevice ? 0.75 : 0.95;

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
  const samples = isTouchDevice ? 8 : 16;
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
  if (!lightingEnabled) {
    revealItems.forEach((item) => item.el.style.setProperty("--h-opacity", "0"));
    return;
  }
  if (!revealItems.length) return;
  const maxDist = revealMaxDist;

  const draggedVolBar = draggedVol
    ? draggedVol.querySelector(".vol-bar")
    : volumeSlider && volumeSlider.classList.contains("dragging")
    ? volumeSlider.querySelector(".vol-bar")
    : null;

  revealItems.forEach((item) => {
    const strokeSources = [];

    // 鼠标作为高光源；触控设备没有光标跟随，跳过以节省性能，但拖动音量条时例外
    if (!isTouchDevice || draggedVolBar) {
      const mouseDist = Math.hypot(lastMouseX - item.cx, lastMouseY - item.cy);
      if (mouseDist < maxDist) {
        const w = Math.max(0, 1 - mouseDist / maxDist);
        const angle = Math.atan2(lastMouseY - item.cy, lastMouseX - item.cx);
        strokeSources.push({ w, angle, dist: mouseDist });
      }
    }

    // 已选中按钮：所有非自身按钮都作为高光源（包括 pad，效果迁移到 pad 网格）
    const touchDistMul = isTouchDevice ? 0.6 : 1;
    selectedCenters.forEach((center) => {
      if (center.el === item.el) return;
      const dx = center.cx - item.cx;
      const dy = center.cy - item.cy;
      const dist = Math.hypot(dx, dy);
      // M/S 按钮体积小，对周围按钮的高光影响范围和强度都更小
      // pad 按当前 layer 比例缩放高光影响范围和强度
      const ratio = center.layerRatio ?? 1;
      const sourceMaxDist = (center.isSmallBtn ? maxDist * 0.5 : maxDist) * ratio * touchDistMul;
      const weightMul = (center.isSmallBtn ? 0.5 : 1) * ratio * (isTouchDevice ? 0.7 : 1);
      if (dist < sourceMaxDist && dist > 0) {
        const w = Math.max(0, 1 - dist / sourceMaxDist) * weightMul;
        const angle = Math.atan2(dy, dx);
        strokeSources.push({ w, angle, dist });
      }
    });

    // 锐利描边（::after）：鼠标 + 选中按钮共同作用，按方向叠加
    // toggle 需要完整圆环，但整体亮度仍随鼠标/光源方向变化
    const isToggle = item.el.classList.contains("toggle");
    const isVolBar = item.el.classList.contains("vol-bar");
    const baseAlpha = isToggle && strokeSources.length > 0 ? 0.28 : 0;
    const stroke = isVolBar
      ? buildVolBarGradient(strokeSources, baseAlpha, item.width)
      : buildRevealGradient(strokeSources, baseAlpha);
    item.el.style.setProperty("--h-opacity", Math.min(1, stroke.maxIntensity).toFixed(3));
    item.el.style.setProperty("--h-grad", stroke.gradient);

    // 拖动音量条时，即使鼠标离开元素也保持完整高光并指向鼠标
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
  if (revealRaf) return;
  revealRaf = requestAnimationFrame((now) => {
    revealRaf = null;
    // 限制约 30fps，降低快速移动鼠标时的 CPU 占用，避免影响音频调度
    if (now - lastHighlightFrame < 30) return;
    lastHighlightFrame = now;
    updateRevealHighlights();
  });
}

document.addEventListener("mousemove", (e) => {
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
  resizeTimeout = setTimeout(refreshRevealEls, 100);
});

window.addEventListener("load", () => {
  refreshRevealEls();
  updateRevealHighlights();
});
refreshRevealEls();
updateRevealHighlights();

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

motionToggle.addEventListener("change", (e) => {
  lightingEnabled = e.target.checked;
  document.querySelector(".app")?.classList.toggle("lighting-off", !lightingEnabled);
  if (!lightingEnabled) {
    revealItems.forEach((item) => item.el.style.setProperty("--h-opacity", "0"));
  } else {
    scheduleRevealUpdate();
  }
});

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
  // 即使没有初始化音频，也主动创建上下文并加载新套件采样
  ensureAudio();
  updateTrackLabels();
  buildSequencer();
  buildTrackVolumes();
  syncDomToBank();
  highlightStep(currentStep);
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
function buildVizGrid() {
  for (let i = 0; i < STEPS; i++) {
    const bar = document.createElement("div");
    bar.className = "viz-bar";
    vizGrid.appendChild(bar);
  }
}

function updateVisualization() {
  const bars = vizGrid.querySelectorAll(".viz-bar");
  bars.forEach((bar, col) => {
    const totalRatio = bankStates[currentBank].reduce((sum, row, rowIdx) => {
      const maxLayer = getMaxLayer(rowIdx);
      return sum + (maxLayer > 0 ? row[col] / maxLayer : 0);
    }, 0);
    let h = 8 + (totalRatio / instruments.length) * 72;
    if (col === currentStep) h *= 1.25;
    bar.style.height = `${Math.min(100, h)}%`;
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
highlightStep(currentStep);
updatePlayhead();
applyPatternAllBanks(currentRhythm);
syncDomToBank();
updateVisualization();
setVolume(volume);
setBpm(bpm);
