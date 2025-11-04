/* ==================== THEME ==================== */
const body = document.body;
const themeToggle = document.getElementById("theme-toggle");
const themeLabel = document.getElementById("theme-label");

function applyTheme(isDark) {
  if (isDark) {
    body.classList.remove("theme-light");
    body.classList.add("theme-dark");
    themeLabel.textContent = "Dark";
  } else {
    body.classList.remove("theme-dark");
    body.classList.add("theme-light");
    themeLabel.textContent = "Light";
  }
  localStorage.setItem("theme", isDark ? "dark" : "light");
}
const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const initialDark = savedTheme === "dark" || (!savedTheme && prefersDark);
themeToggle.checked = initialDark;
applyTheme(initialDark);
themeToggle.addEventListener("change", () => applyTheme(themeToggle.checked));

/* ==================== GLOBAL STATE ==================== */
const audioData = [];           // index = slot-1 → {audio, objectURL, fileName, volume, noOfSound}
let counter = 0;                // highest slot ever used
let nextSoundId = 1;
const usedIds = new Set();

const container = document.getElementById("sound-effects-container");  // slots 1–12
const newContainer = document.getElementById("new");                  // slots 13+

/* ==================== HELPERS ==================== */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function base64ToBlob(b64, mime) {
  const byteChars = atob(b64);
  const byteArrays = [];
  for (let i = 0; i < byteChars.length; i++) {
    byteArrays.push(byteChars.charCodeAt(i));
  }
  return new Blob([new Uint8Array(byteArrays)], { type: mime });
}

/* ==================== CREATE SOUND EFFECT ==================== */
function createSoundEffect(slot, cfg = null) {
  counter = Math.max(counter, slot);

  const noOfSound = cfg?.noOfSound ?? nextSoundId++;
  if (cfg?.noOfSound) usedIds.add(noOfSound);

  /* ---------- visual difference ---------- */
  const isLoaded = !!cfg?.fileName;
  const labelCls = isLoaded ? "text-success fw-bold" : "text-muted";
  const fileDisplay = isLoaded
    ? `<strong>${cfg.fileName}</strong>`
    : `<em>No file selected</em>`;
  const btnCls = isLoaded
    ? "btn-success" : "btn-outline-secondary";
  const btnDisabled = isLoaded ? "" : "disabled";

  const template = `
    <div class="col-md-4" data-index="${slot}" data-sound-id="${noOfSound}">
      <div class="form-group">
        <label class="control-label ${labelCls}">Sound Effect ${slot}:</label>
        <div class="file-name-display mb-1" id="sound-effect-${slot}-file-name">
          ${fileDisplay}
        </div>
        <input type="file" accept="audio/*" id="sound-effect-${slot}-file" class="form-control-file">
        <div class="d-flex align-items-center mt-2">
          <button id="sound-effect-${slot}-play-button"
                  class="btn ${btnCls} me-1" ${btnDisabled}>Play</button>
          <button id="sound-effect-${slot}-stop-button"
                  class="btn ${isLoaded ? 'btn-danger' : 'btn-outline-secondary'}"
                  ${btnDisabled}>Stop</button>
        </div>
        <div class="d-flex align-items-center mt-2">
          <input type="range" id="sound-effect-${slot}-volume-slider"
                 class="form-control-range" min="0" max="100"
                 value="${cfg?.volume ?? 100}">
          <span id="sound-effect-${slot}-volume-viewer"
                class="volume-viewer ms-2">${cfg?.volume ?? 100}%</span>
        </div>
      </div>
    </div>
  `;

  const target = slot <= 12 ? container : newContainer;
  target.insertAdjacentHTML("beforeend", template);

  const audio = new Audio();
  let objectURL = null;
  let fileName = cfg?.fileName ?? "";

  audioData[slot - 1] = { audio, objectURL, fileName, volume: cfg?.volume ?? 100, noOfSound };

  const fileInput     = document.getElementById(`sound-effect-${slot}-file`);
  const fileNameDiv   = document.getElementById(`sound-effect-${slot}-file-name`);
  const playBtn       = document.getElementById(`sound-effect-${slot}-play-button`);
  const stopBtn       = document.getElementById(`sound-effect-${slot}-stop-button`);
  const volSlider     = document.getElementById(`sound-effect-${slot}-volume-slider`);
  const volViewer     = document.getElementById(`sound-effect-${slot}-volume-viewer`);

  /* ---- volume ---- */
  const syncVolume = () => {
    const v = volSlider.value;
    audio.volume = v / 100;
    volViewer.textContent = `${v}%`;
    audioData[slot - 1].volume = +v;
  };
  volSlider.addEventListener("input", syncVolume);

  /* ---- file change ---- */
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    fileNameDiv.innerHTML = `<strong>${file.name}</strong>`;
    audioData[slot - 1].fileName = file.name;

    if (audioData[slot - 1].objectURL) URL.revokeObjectURL(audioData[slot - 1].objectURL);

    const url = URL.createObjectURL(file);
    audioData[slot - 1].objectURL = url;
    audio.src = url;
    audio.load();

    playBtn.disabled = false;
    stopBtn.disabled = false;
    playBtn.className = "btn btn-success me-1";
    stopBtn.className = "btn btn-danger";
  });

  /* ---- play / stop ---- */
  playBtn.addEventListener("click", () => {
    audio.currentTime = 0;
    audio.volume = volSlider.value / 100;
    audio.play().catch(e => console.error("Play error:", e));
  });
  stopBtn.addEventListener("click", () => {
    audio.pause();
    audio.currentTime = 0;
  });

  /* ---- import: base64 → blob → play ---- */
  if (cfg?.base64 && cfg?.mime) {
    const blob = base64ToBlob(cfg.base64, cfg.mime);
    const url = URL.createObjectURL(blob);
    audioData[slot - 1].objectURL = url;
    audio.src = url;
    audio.load();
    playBtn.disabled = false;
    stopBtn.disabled = false;
    playBtn.className = "btn btn-success me-1";
    stopBtn.className = "btn btn-danger";
  }

  /* ---- cleanup ---- */
  window.addEventListener("beforeunload", () => {
    if (audioData[slot - 1]?.objectURL) URL.revokeObjectURL(audioData[slot - 1].objectURL);
  });
}

/* ==================== INITIAL 12 SLOTS ==================== */
for (let i = 1; i <= 12; i++) createSoundEffect(i);

/* ==================== ADD / DELETE ==================== */
document.getElementById("add-button").onclick = () => createSoundEffect(++counter);

document.getElementById("delete-button").onclick = () => {
  if (counter <= 12) return;
  const last = newContainer.lastElementChild;
  if (!last) return;
  const slot = +last.dataset.index;
  const sid = +last.dataset.soundId;
  if (audioData[slot - 1]?.objectURL) URL.revokeObjectURL(audioData[slot - 1].objectURL);
  usedIds.delete(sid);
  audioData[slot - 1] = null;
  last.remove();
  counter--;
};

/* ==================== EXPORT CONFIG ==================== */
document.getElementById("export-config").onclick = async () => {
  const sounds = [];

  for (let i = 0; i < audioData.length; i++) {
    const d = audioData[i];
    if (!d || !d.objectURL) continue;

    const fileInput = document.getElementById(`sound-effect-${i + 1}-file`);
    const file = fileInput.files[0];
    if (!file) continue;

    const base64 = await fileToBase64(file);
    sounds.push({
      fileName: d.fileName,
      noOfSound: d.noOfSound,
      volume: d.volume,
      slot: i + 1,
      mime: file.type || "audio/mpeg",
      base64
    });
  }

  const json = JSON.stringify({ version: 1, sounds }, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sound-effects-config.json";
  a.click();
  URL.revokeObjectURL(url);
};

/* ==================== IMPORT CONFIG ==================== */
const importInput = document.getElementById("import-file-input");
document.getElementById("import-config").onclick = () => importInput.click();

importInput.addEventListener("change", () => {
  const file = importInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const cfg = JSON.parse(e.target.result);
      if (!cfg.sounds || !Array.isArray(cfg.sounds)) throw new Error("Invalid format");

      // Reset ID pool
      usedIds.clear();
      nextSoundId = 1;

      // Remove all dynamic slots (>12)
      while (counter > 12) {
        document.getElementById("delete-button").click();
      }

      // Find highest slot in config
      const maxSlot = Math.max(...cfg.sounds.map(s => s.slot), 12);

      // Ensure we have enough slots (1 to maxSlot)
      while (counter < maxSlot) {
        document.getElementById("add-button").click();
      }

      // Clear existing content for ALL slots (1 to maxSlot)
      for (let slot = 1; slot <= maxSlot; slot++) {
        const existing = document.querySelector(`[data-index="${slot}"]`);
        if (existing) existing.remove();
        audioData[slot - 1] = null; // clear old data
      }

      // Re-create slots in order (1, 2, 3, ...)
      for (let slot = 1; slot <= maxSlot; slot++) {
        const soundConfig = cfg.sounds.find(s => s.slot === slot);
        createSoundEffect(slot, soundConfig || null);
      }

      // Update nextSoundId
      cfg.sounds.forEach(s => {
        usedIds.add(s.noOfSound);
        if (s.noOfSound >= nextSoundId) nextSoundId = s.noOfSound + 1;
      });

      alert("Config imported! All sounds are in correct slots.");
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  };
  reader.readAsText(file);
});
