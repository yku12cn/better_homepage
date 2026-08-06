# Better Homepage <img src="extension/icons/icon128.png" align="right" height="138" alt="Better Homepage" /></a>

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Better Homepage** is a clean, modern, and highly customizable replacement for Google Chrome's Default New Tab page. Organize your daily bookmarks into customizable sections, pick emoji or custom image icons, search using your favorite engine, and seamlessly back up your setup using JSON export/import.

---

## Features

- 📁 **Organized Sections & Shortcuts**: Group bookmarks into custom titled sections. Reorder shortcuts seamlessly with intuitive drag-and-drop.
- 😀 **Rich Icon Customization**:
  - Automatically fetches standard website favicons.
  - Built-in category-based **Emoji Picker** (Smileys, Animals, Food, Travel, Objects, Symbols).
  - Upload custom image icons (automatically resized and compressed to optimized $128 \times 128$ PNG format).
- 🌙 **Dark & Light Themes**: Toggle cleanly between dark and light modes according to your preference.
- 💾 **JSON Import & Export**: Effortlessly back up, share, or transfer your setup across browser profiles and machines.
- ⚡ **High Performance & Secure**: Light weight, self-contained, local realization.

---

## Installation (Developer / Unpacked Mode)

1. **Clone or Download** this repository
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the directory containing `manifest.json`.
5. Open a new tab to see **Better Homepage** in action! 🎉
---

## Directory Structure

```text
better-homepage/
├── chrome_store            # Chrome store display materials
|   ├── icon48.png
|   ├── marquee_promo_tile.html
|   └── Small_promo_tile.png
└── Extension               # Main folder for the extension
    ├── manifest.json       # Extension configuration (Manifest V3)
    ├── newtab.html         # New tab page HTML markup
    ├── script.js           # Core extension logic
    ├── styles.css          # Design system, theme variables, and layouts
    └── icons/              # Extension icons (16x16, 48x48, 128x128)
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

---

## Usage Guide

### Managing Shortcuts & Sections
- **Add a Shortcut**: Click the `+` card inside any section grid.
- **Edit / Delete Shortcut**: Right-click on any shortcut card to open the context menu. You can modify the URL, label, or icon.
- **Reorder Shortcuts**: Click and drag a shortcut card to move it within or across sections.
- **Add a Section**: Scroll down and click the **+ Add Section** button.
- **Rename Section**: Click directly on a section title to edit it inline.

### Changing Search Engine
1. Click the **⋮ Settings** icon in the top right.
2. Select **Customize Search Engine**.
3. Choose a preset or select **Custom Engine** and enter a query URL (e.g. `https://www.google.com/search?q=%s`).

### Exporting & Importing Settings
- Click **⋮ Settings** $\rightarrow$ **Export Configuration** to download your config as a `.json` file.
- Click **⋮ Settings** $\rightarrow$ **Import Configuration** to restore from a previously exported `.json` file.

---

## Security & Performance Highlights

- **XSS Prevention**: HTML input encoding and strict JSON validation prevent malicious execution during config imports.
- **Optimized Storage**: Custom uploaded icons are automatically scaled and compressed via an HTML5 canvas element before being saved to `chrome.storage.local`.
- **Minimum Footprint**: Runs purely locally without any external dependencies. No userdata collections.

