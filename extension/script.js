const EMOJI_CATEGORIES = [
  { id: 'smileys', icon: '😀', label: 'Smileys & Emotion', ranges: [[0x1F600, 0x1F64F]] },
  { id: 'people', icon: '👋', label: 'People & Body', ranges: [[0x1F440, 0x1F49F], [0x1F90C, 0x1F93E]] },
  { id: 'animals', icon: '🐶', label: 'Animals & Nature', ranges: [[0x1F400, 0x1F43E], [0x1F330, 0x1F353], [0x1F980, 0x1F9AE]] },
  { id: 'food', icon: '🍕', label: 'Food & Drink', ranges: [[0x1F32D, 0x1F37F], [0x1F9C0, 0x1F9CB]] },
  { id: 'travel', icon: '🚀', label: 'Travel & Places', ranges: [[0x1F680, 0x1F6FF], [0x1F300, 0x1F320]] },
  { id: 'objects', icon: '💻', label: 'Objects & Tech', ranges: [[0x1F4A0, 0x1F5FF], [0x1FA70, 0x1FA9F]] },
  { id: 'symbols', icon: '🔣', label: 'Symbols & Shapes', ranges: [[0x2600, 0x26FF], [0x2700, 0x27BF], [0x1F9E0, 0x1F9FF]] }
];

const categoryEmojiCache = {};
let activeCategoryId = 'smileys';
let selectedEmojiValue = '⚡';

const SEARCH_PRESETS = {
  google: { name: 'Google', searchUrl: 'https://www.google.com/search?q=%s' },
  bing: { name: 'Bing', searchUrl: 'https://www.bing.com/search?q=%s' },
  duckduckgo: { name: 'DuckDuckGo', searchUrl: 'https://duckduckgo.com/?q=%s' }
};

const DEFAULT_STATE = {
  theme: 'dark',
  searchEngineKey: 'google',
  customSearchEngine: { name: '', searchUrl: '' },
  folders: [
    {
      id: 'folder-1',
      title: 'Main Shortcuts',
      shortcuts: [
        { id: 'sc-1', url: 'https://google.com', label: 'Google', iconType: 'default', iconValue: '' },
        { id: 'sc-2', url: 'https://youtube.com', label: 'YouTube', iconType: 'default', iconValue: '' },
        { id: 'sc-3', url: 'https://github.com', label: 'GitHub', iconType: 'default', iconValue: '' }
      ]
    }
  ]
};

let appState = { ...DEFAULT_STATE };
let activeContextMenuTarget = null;
let draggedItem = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadState();
  applyTheme(appState.theme);
  setupMenuAndModals();
  setupSearchForm();
  updateSearchEngineFavicon();
  setupEmojiPicker();
  render();
  setupGlobalEvents();
  setupAddFolderCursorDetection();
});

async function loadState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['better_homepage_data'], (result) => {
      if (result.better_homepage_data) {
        appState = { ...DEFAULT_STATE, ...result.better_homepage_data };
      }
      resolve();
    });
  });
}

function saveState() {
  chrome.storage.local.set({ better_homepage_data: appState });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function getActiveEngine() {
  if (appState.searchEngineKey === 'custom') return appState.customSearchEngine;
  return SEARCH_PRESETS[appState.searchEngineKey] || SEARCH_PRESETS.google;
}

function updateSearchEngineFavicon() {
  const engine = getActiveEngine();
  const iconEl = document.getElementById('searchEngineIcon');
  const domain = getDomain(engine.searchUrl || 'https://www.google.com');
  iconEl.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function setupSearchForm() {
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    const engine = getActiveEngine();
    const searchUrl = (engine.searchUrl || 'https://www.google.com/search?q=%s')
      .replace('%s', encodeURIComponent(query));

    window.location.href = searchUrl;
  });
}

function setupMenuAndModals() {
  const menuBtn = document.getElementById('menuBtn');
  const dropdown = document.getElementById('settingsDropdown');
  const importFileInput = document.getElementById('importFileInput');

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
  });

  document.getElementById('menuThemeToggle').addEventListener('click', () => {
    appState.theme = appState.theme === 'light' ? 'dark' : 'light';
    applyTheme(appState.theme);
    saveState();
    dropdown.classList.add('hidden');
  });

  document.getElementById('menuExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `better-homepage-config-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    dropdown.classList.add('hidden');
  });

  document.getElementById('menuImport').addEventListener('click', () => {
    importFileInput.click();
    dropdown.classList.add('hidden');
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData && Array.isArray(importedData.folders)) {
          appState = importedData;
          applyTheme(appState.theme || 'light');
          saveState();
          updateSearchEngineFavicon();
          render();
        } else {
          alert('Invalid configuration structure.');
        }
      } catch {
        alert('Invalid JSON configuration file.');
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });

  document.getElementById('menuSearchConfig').addEventListener('click', () => {
    openSearchModal();
    dropdown.classList.add('hidden');
  });

  document.getElementById('addFolderBtn').addEventListener('click', () => {
    appState.folders.push({
      id: 'folder-' + Date.now(),
      title: 'New Section',
      shortcuts: []
    });
    saveState();
    render();
  });
}

function getCategoryEmojis(catId) {
  if (categoryEmojiCache[catId]) return categoryEmojiCache[catId];

  const category = EMOJI_CATEGORIES.find(c => c.id === catId);
  if (!category) return [];

  const emojis = [];
  const emojiRegex = /\p{Extended_Pictographic}/u;

  category.ranges.forEach(([start, end]) => {
    for (let cp = start; cp <= end; cp++) {
      const char = String.fromCodePoint(cp);
      if (emojiRegex.test(char)) {
        emojis.push(char);
      }
    }
  });

  categoryEmojiCache[catId] = emojis;
  return emojis;
}

function setupEmojiPicker() {
  renderCategoryTabs();
  renderEmojiGrid(activeCategoryId);
}

function renderCategoryTabs() {
  const container = document.getElementById('emojiCategories');
  container.innerHTML = '';

  EMOJI_CATEGORIES.forEach(cat => {
    const tab = document.createElement('button');
    tab.className = 'category-tab';
    if (cat.id === activeCategoryId) tab.classList.add('active');
    tab.textContent = cat.icon;
    tab.title = cat.label;
    tab.type = 'button';

    tab.addEventListener('click', () => {
      activeCategoryId = cat.id;
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderEmojiGrid(cat.id);
    });

    container.appendChild(tab);
  });
}

function renderEmojiGrid(catId) {
  const grid = document.getElementById('emojiGrid');
  grid.innerHTML = '';

  const emojis = getCategoryEmojis(catId);
  const fragment = document.createDocumentFragment();

  emojis.forEach(char => {
    const el = document.createElement('div');
    el.className = 'emoji-item';
    if (char === selectedEmojiValue) {
      el.classList.add('selected');
    }
    el.textContent = char;

    el.addEventListener('click', () => {
      selectedEmojiValue = char;
      document.querySelectorAll('.emoji-item').forEach(i => i.classList.remove('selected'));
      el.classList.add('selected');
    });

    fragment.appendChild(el);
  });

  grid.appendChild(fragment);
}

function setupAddFolderCursorDetection() {
  const addFolderBtn = document.getElementById('addFolderBtn');
  let ticking = false;

  document.addEventListener('mousemove', (e) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const folderSections = document.querySelectorAll('.folder-section');
        if (folderSections.length === 0) {
          addFolderBtn.classList.add('visible');
        } else {
          const lastFolder = folderSections[folderSections.length - 1];
          const lastFolderRect = lastFolder.getBoundingClientRect();
          addFolderBtn.classList.toggle('visible', e.clientY > lastFolderRect.bottom);
        }
        ticking = false;
      });
      ticking = true;
    }
  });
}

const seModal = document.getElementById('searchEngineModal');
const presetSelect = document.getElementById('presetSearchSelect');
const customFields = document.getElementById('customSearchFields');

function openSearchModal() {
  presetSelect.value = appState.searchEngineKey || 'google';
  if (appState.searchEngineKey === 'custom') {
    customFields.classList.remove('hidden');
    document.getElementById('seName').value = appState.customSearchEngine.name || '';
    document.getElementById('seUrl').value = appState.customSearchEngine.searchUrl || '';
  } else {
    customFields.classList.add('hidden');
  }
  seModal.classList.remove('hidden');
}

presetSelect.addEventListener('change', (e) => {
  customFields.classList.toggle('hidden', e.target.value !== 'custom');
});

document.getElementById('seCancelBtn').addEventListener('click', () => seModal.classList.add('hidden'));

document.getElementById('seSaveBtn').addEventListener('click', () => {
  const selectedKey = presetSelect.value;
  appState.searchEngineKey = selectedKey;

  if (selectedKey === 'custom') {
    appState.customSearchEngine = {
      name: document.getElementById('seName').value.trim(),
      searchUrl: document.getElementById('seUrl').value.trim()
    };
  }

  saveState();
  updateSearchEngineFavicon();
  seModal.classList.add('hidden');
});

function render() {
  const container = document.getElementById('foldersContainer');
  container.innerHTML = '';

  appState.folders.forEach((folder) => {
    const folderEl = document.createElement('section');
    folderEl.className = 'folder-section';

    const safeFolderId = escapeHtml(folder.id);
    const safeFolderTitle = escapeHtml(folder.title);

    folderEl.innerHTML = `
      <div class="folder-header">
        <input class="folder-title" value="${safeFolderTitle}" data-folder-id="${safeFolderId}">
        <button class="delete-folder-btn" data-folder-id="${safeFolderId}" title="Delete Folder">✕</button>
      </div>
      <div class="shortcuts-grid" data-folder-id="${safeFolderId}"></div>
    `;

    const grid = folderEl.querySelector('.shortcuts-grid');

    folder.shortcuts.forEach((sc) => {
      grid.appendChild(createShortcutCard(sc, folder.id));
    });

    const addCard = document.createElement('div');
    addCard.className = 'add-shortcut-card';
    addCard.textContent = '+';
    addCard.title = 'Add Shortcut';
    addCard.addEventListener('click', () => addShortcut(folder.id));
    grid.appendChild(addCard);

    setupGridDropZone(grid, folder.id);
    container.appendChild(folderEl);
  });

  document.querySelectorAll('.folder-title').forEach(input => {
    input.addEventListener('change', (e) => {
      const folder = appState.folders.find(f => f.id === e.target.dataset.folderId);
      if (folder) {
        folder.title = e.target.value;
        saveState();
      }
    });
  });

  document.querySelectorAll('.delete-folder-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const folderId = e.target.dataset.folderId;
      if (confirm('Delete this section?')) {
        appState.folders = appState.folders.filter(f => f.id !== folderId);
        saveState();
        render();
      }
    });
  });
}

function createShortcutCard(sc, folderId) {
  const card = document.createElement('a');
  card.className = 'shortcut-card';
  card.href = sc.url;
  card.draggable = true;
  card.dataset.shortcutId = sc.id;
  card.dataset.folderId = folderId;

  let iconHTML = '';
  if (sc.iconType === 'emoji') {
    iconHTML = `<span class="shortcut-icon">${sc.iconValue || '⚡'}</span>`;
  } else if (sc.iconType === 'custom' && sc.iconValue) {
    iconHTML = `<div class="shortcut-icon"><img src="${sc.iconValue}" alt="icon"></div>`;
  } else {
    const domain = getDomain(sc.url);
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    iconHTML = `<div class="shortcut-icon"><img src="${faviconUrl}" alt="icon"></div>`;
  }

  card.innerHTML = `${iconHTML}<span class="shortcut-label">${escapeHtml(sc.label)}</span>`;

  card.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openContextMenu(e.clientX, e.clientY, folderId, sc.id);
  });

  card.addEventListener('dragstart', () => {
    draggedItem = { folderId, shortcutId: sc.id };
  });

  return card;
}

function getDomain(urlStr) {
  try { return new URL(urlStr).hostname; } catch { return urlStr; }
}

function addShortcut(folderId) {
  const folder = appState.folders.find(f => f.id === folderId);
  if (!folder) return;

  const newSc = {
    id: 'sc-' + Date.now(),
    url: 'https://',
    label: 'New Link',
    iconType: 'default',
    iconValue: ''
  };

  folder.shortcuts.push(newSc);
  render();
  openEditModal(folderId, newSc.id, true);
}

function getClosestCard(grid, x, y) {
  const cards = Array.from(grid.querySelectorAll('.shortcut-card'));
  if (cards.length === 0) return null;

  let closestCard = null;
  let minDistance = Infinity;

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;

    const distance = Math.hypot(x - cardCenterX, y - cardCenterY);
    if (distance < minDistance) {
      minDistance = distance;
      closestCard = card;
    }
  });

  return closestCard;
}

function setupGridDropZone(grid, folderId) {
  grid.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    const targetCard = getClosestCard(grid, e.clientX, e.clientY);
    clearDropIndicators();

    if (targetCard) {
      const rect = targetCard.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      if (e.clientX < midX) {
        targetCard.classList.add('drop-indicator-left');
      } else {
        targetCard.classList.add('drop-indicator-right');
      }
    }
  });

  grid.addEventListener('dragleave', (e) => {
    if (!grid.contains(e.relatedTarget)) {
      clearDropIndicators();
    }
  });

  grid.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    const targetCard = getClosestCard(grid, e.clientX, e.clientY);
    const sourceFolder = appState.folders.find(f => f.id === draggedItem.folderId);
    const targetFolder = appState.folders.find(f => f.id === folderId);

    if (!sourceFolder || !targetFolder) {
      clearDropIndicators();
      return;
    }

    const shortcutIdx = sourceFolder.shortcuts.findIndex(s => s.id === draggedItem.shortcutId);
    if (shortcutIdx === -1) {
      clearDropIndicators();
      return;
    }

    const [item] = sourceFolder.shortcuts.splice(shortcutIdx, 1);

    if (targetCard) {
      const rect = targetCard.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      const isLeft = e.clientX < midX;

      const targetScId = targetCard.dataset.shortcutId;
      let targetIdx = targetFolder.shortcuts.findIndex(s => s.id === targetScId);

      if (!isLeft) targetIdx += 1;
      targetFolder.shortcuts.splice(targetIdx, 0, item);
    } else {
      targetFolder.shortcuts.push(item);
    }

    clearDropIndicators();
    saveState();
    render();
    draggedItem = null;
  });
}

function clearDropIndicators() {
  document.querySelectorAll('.shortcut-card').forEach(card => {
    card.classList.remove('drop-indicator-left', 'drop-indicator-right');
  });
}

const contextMenu = document.getElementById('contextMenu');

function openContextMenu(x, y, folderId, shortcutId) {
  activeContextMenuTarget = { folderId, shortcutId, isNew: false };
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.remove('hidden');
}

function setupGlobalEvents() {
  document.addEventListener('click', (e) => {
    contextMenu.classList.add('hidden');
    if (!e.target.closest('.menu-container')) {
      document.getElementById('settingsDropdown').classList.add('hidden');
    }
  });

  document.getElementById('cmEdit').addEventListener('click', () => {
    if (activeContextMenuTarget) openEditModal(activeContextMenuTarget.folderId, activeContextMenuTarget.shortcutId, false);
  });

  document.getElementById('cmDelete').addEventListener('click', () => {
    if (!activeContextMenuTarget) return;
    const { folderId, shortcutId } = activeContextMenuTarget;
    const folder = appState.folders.find(f => f.id === folderId);
    if (folder) {
      folder.shortcuts = folder.shortcuts.filter(s => s.id !== shortcutId);
      saveState();
      render();
    }
  });
}

const editModal = document.getElementById('editModal');
const radioIconTypes = document.getElementsByName('iconType');

function openEditModal(folderId, shortcutId, isNew = false) {
  activeContextMenuTarget = { folderId, shortcutId, isNew };
  const folder = appState.folders.find(f => f.id === folderId);
  const sc = folder ? folder.shortcuts.find(s => s.id === shortcutId) : null;
  if (!sc) return;

  document.getElementById('editUrl').value = sc.url;
  document.getElementById('editLabel').value = sc.label;

  for (const radio of radioIconTypes) {
    radio.checked = (radio.value === sc.iconType);
  }

  selectedEmojiValue = (sc.iconType === 'emoji' && sc.iconValue) ? sc.iconValue : '⚡';
  activeCategoryId = 'smileys';
  renderCategoryTabs();
  renderEmojiGrid(activeCategoryId);

  toggleIconInputs(sc.iconType);
  editModal.classList.remove('hidden');
}

function toggleIconInputs(type) {
  document.getElementById('emojiInputGroup').classList.toggle('hidden', type !== 'emoji');
  document.getElementById('imageInputGroup').classList.toggle('hidden', type !== 'custom');
}

Array.from(radioIconTypes).forEach(radio => {
  radio.addEventListener('change', (e) => toggleIconInputs(e.target.value));
});

document.getElementById('modalCancelBtn').addEventListener('click', () => {
  if (activeContextMenuTarget && activeContextMenuTarget.isNew) {
    const { folderId, shortcutId } = activeContextMenuTarget;
    const folder = appState.folders.find(f => f.id === folderId);
    if (folder) {
      folder.shortcuts = folder.shortcuts.filter(s => s.id !== shortcutId);
      render();
    }
  }
  editModal.classList.add('hidden');
  activeContextMenuTarget = null;
});

document.getElementById('modalSaveBtn').addEventListener('click', async () => {
  if (!activeContextMenuTarget) return;
  const { folderId, shortcutId } = activeContextMenuTarget;
  const folder = appState.folders.find(f => f.id === folderId);
  const sc = folder ? folder.shortcuts.find(s => s.id === shortcutId) : null;

  if (sc) {
    sc.url = document.getElementById('editUrl').value.trim() || 'https://';
    sc.label = document.getElementById('editLabel').value.trim() || 'Bookmark';
    const selectedType = Array.from(radioIconTypes).find(r => r.checked).value;
    sc.iconType = selectedType;

    if (selectedType === 'emoji') {
      sc.iconValue = selectedEmojiValue;
    } else if (selectedType === 'custom') {
      const fileInput = document.getElementById('editImageFile');
      if (fileInput.files && fileInput.files[0]) {
        sc.iconValue = await readFileAsBase64(fileInput.files[0]);
      }
    } else {
      sc.iconValue = '';
    }

    saveState();
    render();
  }

  editModal.classList.add('hidden');
  activeContextMenuTarget = null;
});

function readFileAsBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}