import './style.css';

const dropzone = document.getElementById("dropzone");
const output = document.getElementById("commandOutput");
const urlInput = document.getElementById("urlInput");
const multiUrlInput = document.getElementById("multiUrlInput");
const importProfilesInput = document.getElementById("importProfiles");
const btnImportProfiles = document.getElementById("btnImportProfiles");
const btnThemeLight = document.getElementById("btnThemeLight");
const btnThemeDark = document.getElementById("btnThemeDark");
const btnThemeSolar = document.getElementById("btnThemeSolar");
const btnThemeCyber = document.getElementById("btnThemeCyber");
const btnThemeMinimal = document.getElementById("btnThemeMinimal");
const saveFavoriteBtn = document.getElementById("saveFavoriteBtn");
let args = [];
let profiles = JSON.parse(localStorage.getItem("ytProfiles") || "[]");
let favorites = JSON.parse(localStorage.getItem("ytFavorites") || "[]");
let invalidArgs = [];
const baseClasses = document.body.className.split(" ").filter(c => !c.startsWith("theme-"));
let currentTheme = Array.from(document.body.classList).find(c => c.startsWith("theme-")) || "theme-dark";

const uniqueFlags = { '--merge-output-format': [], '-f': ['--format'], '--format': ['-f'] };

function validateArgs(currentArgs) {
  const invalidIndices = new Set();
  const flagCounts = {};
  const argFlags = currentArgs.map(arg => arg.split(" ")[0]);

  argFlags.forEach(flag => {
    let canonicalFlag = flag;
    for (const [key, aliases] of Object.entries(uniqueFlags)) {
      if (key === flag || aliases.includes(flag)) {
        canonicalFlag = key;
        break;
      }
    }
    if (uniqueFlags.hasOwnProperty(canonicalFlag)) {
      flagCounts[canonicalFlag] = (flagCounts[canonicalFlag] || 0) + 1;
    }
  });

  argFlags.forEach((flag, index) => {
    let canonicalFlag = flag;
    for (const [key, aliases] of Object.entries(uniqueFlags)) {
      if (key === flag || aliases.includes(flag)) {
        canonicalFlag = key;
        break;
      }
    }
    if (flagCounts[canonicalFlag] > 1) {
      invalidIndices.add(index);
    }
  });
  return Array.from(invalidIndices);
}

function updateAll() {
  invalidArgs = validateArgs(args);
  renderArgs();
  updateCommand();
}

function initDraggables() {
  document.querySelectorAll("#components .draggable, #presets .draggable").forEach(el => {
    el.addEventListener("dragstart", e => {
      const data = el.dataset.arg || el.dataset.args || "";
      e.dataTransfer.setData("text/plain", data);
    });
  });
}

initDraggables();

let draggedIndex = null;
dropzone.addEventListener("dragover", e => e.preventDefault());
dropzone.addEventListener("drop", e => {
  e.preventDefault();
  const data = e.dataTransfer.getData("text/plain");
  if (!data) return;
  args.push(...data.split(" ").filter(Boolean));
  updateAll();
});

function escapeHTML(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function renderArgs() {
  if (args.length === 0) {
    dropzone.innerHTML = '<div class="text-secondary">Drag options here ⬇️</div>';
    return;
  }
  dropzone.innerHTML = args.map((a, i) => {
    const isInvalid = invalidArgs.includes(i);
    const invalidClass = isInvalid ? 'arg-invalid' : '';
    const invalidTitle = isInvalid ? 'Error: This flag conflicts with another instance of the same flag.' : '';
    return `
    <div ondragover='dragOver(event, ${i})' ondrop='dropHere(${i})' class='flex items-center gap-2 bg-secondary text-primary px-3 py-2 rounded-lg text-sm ${invalidClass}' title="${invalidTitle}">
      <span draggable='true' ondragstart='dragStart(${i})' class='cursor-grab active:cursor-grabbing pr-2 text-secondary' title="Drag to reorder">⣿</span>
      <input type='text' value='${escapeHTML(a)}' onchange='editArg(${i}, this.value)' class='bg-transparent flex-1 focus:outline-none w-full'>
      <button onclick='removeArg(${i})' class='text-red hover:text-primary pl-2'>❌</button>
    </div>`;
  }).join("");
}

window.dragStart = i => draggedIndex = i;
window.dragOver = (e, i) => e.preventDefault();
window.dropHere = i => {
  if (draggedIndex === null || draggedIndex === i) return;
  const dragged = args.splice(draggedIndex, 1)[0];
  args.splice(i, 0, dragged);
  draggedIndex = null;
  updateAll();
};

window.removeArg = i => { args.splice(i, 1); updateAll(); };
window.editArg = (i, val) => { args[i] = val; updateAll(); };

function updateCommand() {
  const urls = multiUrlInput.value.split("\n").map(s => s.trim()).filter(Boolean);
  const url = urlInput.value.trim();
  const target = urls.length > 0 ? urls.join(" ") : (url || "<URL_HERE>");
  output.value = `yt-dlp ${args.join(" ")} ${target}`.trim();
}

urlInput.addEventListener("input", updateCommand);
multiUrlInput.addEventListener("input", updateCommand);

document.getElementById("copyBtn").addEventListener("click", async () => {
  const text = output.value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try { await navigator.clipboard.writeText(text); } catch(e) { const ta = output; ta.select(); document.execCommand("copy"); }
  } else {
    const ta = output; ta.select(); document.execCommand("copy");
  }
});

document.getElementById("exportScriptBtn").addEventListener("click", () => {
  const command = output.value;
  if (!command || command.endsWith("<URL_HERE>")) {
    alert("Cannot export a command without a URL.");
    return;
  }

  const isWindows = navigator.platform.toUpperCase().indexOf('WIN') !== -1;
  const scriptContent = isWindows
    ? `@echo off\n${command}`
    : `#!/bin/bash\n\n${command}`;
  const fileExtension = isWindows ? 'bat' : 'sh';
  const mimeType = isWindows ? 'application/bat' : 'application/x-sh';

  const blob = new Blob([scriptContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `run_yt_dlp.${fileExtension}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById("runPreview").addEventListener("click", () => {
  const log = document.getElementById("executionLog");
  log.classList.remove("hidden");
  log.innerText = `$ ${output.value || "yt-dlp ..."}\n`;
  let pct = 0;
  const interval = setInterval(() => {
    pct += Math.random() * 15;
    if (pct >= 100) {
      log.innerText += "\n[download] 100% Completed!";
      clearInterval(interval);
    } else {
      log.innerText += `\n[download] ${pct.toFixed(1)}% of 24.3MiB at ${(1+Math.random()*3).toFixed(1)}MiB/s ETA 00:${(10+Math.random()*20).toFixed(0)}`;
      log.scrollTop = log.scrollHeight;
    }
  }, 800);
});

saveFavoriteBtn.addEventListener("click", () => {
  const name = prompt("Enter a name for this favorite:");
  if (!name || !name.trim()) return;
  const tagsStr = prompt("Enter comma-separated tags (optional):");
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  favorites.push({ name: name.trim(), args: [...args], tags });
  renderFavorites();
});

function renderFavorites() {
  const list = document.getElementById("favoritesList");
  favorites.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  list.innerHTML = favorites.map((f, i) => {
    const tagsHTML = (f.tags || []).map(tag =>
      `<span class="bg-tertiary text-accent text-xs font-semibold mr-1 px-1.5 py-0.5 rounded-full">${escapeHTML(tag)}</span>`
    ).join(' ');
    const pinClass = f.pinned ? 'text-accent' : 'text-secondary';

    return `
    <li class="flex items-center justify-between text-xs py-1">
      <div class="flex-grow truncate pr-2">
        <div class="font-bold text-primary">${escapeHTML(f.name)}</div>
        <div class="mt-1">${tagsHTML}</div>
      </div>
      <div class="flex items-center">
        <button onclick="togglePin(${i})" title="Pin Favorite" class="${pinClass} hover:text-primary px-2 py-1 rounded">📌</button>
        <button onclick="loadFavorite(${i})" title="Load '${escapeHTML(f.name)}'" class="text-accent hover:text-primary px-2 py-1 rounded">▶</button>
        <button onclick="deleteFavorite(${i})" title="Delete '${escapeHTML(f.name)}'" class="text-red hover:text-primary px-2 py-1 rounded">🗑️</button>
      </div>
    </li>`;
  }).join("");
  localStorage.setItem("ytFavorites", JSON.stringify(favorites));
}

window.loadFavorite = i => {
  if (favorites[i] && favorites[i].args) {
    args = [...favorites[i].args];
    updateAll();
  }
};

window.deleteFavorite = i => {
  if (!favorites[i]) return;
  if (confirm(`Are you sure you want to delete the favorite "${favorites[i].name}"?`)) {
    favorites.splice(i, 1);
    renderFavorites();
  }
};

window.togglePin = i => {
  if (!favorites[i]) return;
  favorites[i].pinned = !favorites[i].pinned;
  renderFavorites();
};

function renderProfiles() {
  const list = document.getElementById("profilesList");
  list.innerHTML = profiles.map((p, i) => `<li class='flex justify-between'><span>${p.name}</span> <button onclick='loadProfile(${i})' class='text-accent'>▶</button></li>`).join("");
}

document.getElementById("saveProfile").addEventListener("click", () => {
  const name = prompt("Profile name?");
  if (!name) return;
  const profile = { name, args: [...args], theme: currentTheme };
  profiles.push(profile);
  localStorage.setItem("ytProfiles", JSON.stringify(profiles));
  renderProfiles();
});

window.loadProfile = i => {
  const p = profiles[i];
  args = Array.isArray(p.args) ? p.args : [];
  applyTheme(p.theme || "theme-dark");
  updateAll();
};

document.getElementById("exportProfiles").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(profiles)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'yt-dlp-profiles.json'; a.click();
  URL.revokeObjectURL(url);
});

btnImportProfiles.addEventListener("click", () => importProfilesInput.click());

importProfilesInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      profiles = Array.isArray(data) ? data : [];
      localStorage.setItem("ytProfiles", JSON.stringify(profiles));
      renderProfiles();
    } catch(_) {}
  };
  reader.readAsText(file);
});

function applyTheme(themeClass) {
  currentTheme = themeClass;
  document.body.className = `${baseClasses.join(" ")} ${currentTheme}`.trim();
  localStorage.setItem('ytBuilderTheme', themeClass);
}

// Load saved theme on startup
const savedTheme = localStorage.getItem('ytBuilderTheme');
if (savedTheme) {
  applyTheme(savedTheme);
}


btnThemeLight.addEventListener("click", () => applyTheme("theme-light"));
btnThemeDark.addEventListener("click", () => applyTheme("theme-dark"));
btnThemeSolar.addEventListener("click", () => applyTheme("theme-solarized"));
btnThemeCyber.addEventListener("click", () => applyTheme("theme-cyberpunk"));
btnThemeMinimal.addEventListener("click", () => applyTheme("theme-minimal"));

document.getElementById("flagSearch").addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll("#components .draggable").forEach(el => {
    const category = el.closest('.category');
    const match = el.innerText.toLowerCase().includes(term);
    el.style.display = match ? "block" : "none";
  });
});

document.querySelectorAll('.category h3').forEach(header => {
  header.addEventListener('click', () => {
    const content = header.nextElementSibling;
    const toggle = header.querySelector('.category-toggle');
    content.classList.toggle('hidden');
    if (toggle) {
      toggle.textContent = content.classList.contains('hidden') ? '▸' : '▾';
    }
  });
});

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.click();
    const originalClasses = Array.from(copyBtn.classList);
    copyBtn.classList.remove('btn-primary'); // Assuming this is the default
    copyBtn.classList.add('bg-blue-500');
    setTimeout(() => {
        copyBtn.classList.remove('bg-blue-500');
        copyBtn.classList.add('btn-primary');
    }, 200);
  }
});

// Initial Render
renderProfiles();
renderFavorites();
updateCommand();
