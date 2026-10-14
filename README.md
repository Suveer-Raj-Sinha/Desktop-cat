<div align="center">

# Desktop Cat 🐈

**A small, cozy, slightly mischievous pixel-art cat that lives on your Windows desktop.**

It wanders along the top of your taskbar, sits, naps, runs about, ponders, finds little treasures, and remembers
everything between sessions. It never needs feeding and never nags.

![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D4)
![Built with Tauri 2](https://img.shields.io/badge/built%20with-Tauri%202-24C8DB)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)
![Rust](https://img.shields.io/badge/Rust-stable-DEA584)
![Version](https://img.shields.io/badge/version-0.9.0-2EA043)
![Local only](https://img.shields.io/badge/data-100%25%20local-8957E5)
<!-- After you publish the repo, replace OWNER/REPO below and remove this comment: -->
<!-- ![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg) -->

</div>

<!--
  Screenshots: take a few (the cat on your desktop, the control panel's Home and Collection pages, Appearance), save them
  in docs/images/, and add them here, for example:
  ![Desktop Cat on the taskbar](docs/images/screenshot.png)
-->

> **Status:** version **0.9.0**, a release candidate. Every planned feature is built. Parts of it still need testing on
> more PCs. See the [release checklist](#release-checklist) and the [roadmap](#roadmap).
>
> ⚠️ **About the artwork:** the cat sprites come from a third-party pack whose licence has **not been confirmed**, so they
> are **not included in this repository**. See [Art assets and licensing](#art-assets-and-licensing) before you build,
> share or redistribute anything.

---

## Contents

- [Highlights](#highlights)
- [Download and install](#download-and-install)
- [Using Desktop Cat](#using-desktop-cat)
- [Build from source](#build-from-source)
- [Releasing](#releasing)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Art assets and licensing](#art-assets-and-licensing)
- [Data, privacy and security](#data-privacy-and-security)
- [Testing](#testing)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [License and credits](#license-and-credits)

---

## Highlights

**A cat with a personality**
- Lives in a thin, fully transparent strip above your taskbar. Clicks pass straight through to the windows behind it;
  only the cat itself takes clicks.
- Uses all six animations in the art pack: sitting down, looking around, lying down, walking, running, running 2.0.
- Chooses what to do by weighted odds (never the same thing twice in a row), shaped by five **moods** (happy, curious,
  sleepy, playful, grumpy) and five **traits** (curiosity, playfulness, affection, laziness, mischief).
- Gets sleepier late at night, and turns to look at your mouse pointer when it comes near. Curious cats sometimes
  wander over to watch it.
- **Ponders** over the taskbar icons: walks to where they are, sits, and a thinking "?" bobs above its head. It knows
  whether your icons are centred or left-aligned.
- Reacts to being petted (a heart floats up), to play and to inspect. Too much fuss makes it grumpy for a while, and it
  just ignores you. It never punishes you for ignoring it.
- Steps aside while a **fullscreen** video, game or presentation is in front, and comes back afterwards.

**Treasures to find**
- 16 collectable treasures (8 common, 4 uncommon, 2 rare, 1 legendary, 1 special) in three sets.
- After walks, looks, pondering and play, the cat has a small chance to find something. It sparkles and leaves a shiny
  gem on the ground. **Click the gem** to see what it was. Unclaimed finds collect themselves after 2 minutes.
- **While you were away**: finds are also rolled for time the app was closed or the PC slept (capped at 8 hours and 5 finds).
- Completing a set unlocks a cosmetic.

**Make it yours**
- 50 fur colours.
- Wearable cosmetics, drawn on every frame of every animation, facing both ways: Red Ribbon, Leaf Crown, Bell Collar.
- Settings for sound, calm mode, hide during fullscreen apps, click-through mode and launch at startup.

**Everything stays on your PC.** No accounts, no network, no telemetry. The cat only *reads* your pointer position;
it never moves your mouse, clicks, types, or listens to your keyboard.

---

## Download and install

> Installers are published on the repository's **Releases** page (see [Releasing](#releasing)). A short guide for people
> you share it with is in [`USER_GUIDE.md`](USER_GUIDE.md).

1. Download `Desktop Cat_<version>_x64-setup.exe` and run it. It installs for the current user only, with no
   administrator rights.
2. Windows may show **"Windows protected your PC"**, because the installer isn't code-signed. Click **More info**, then
   **Run anyway**.
3. Leave "Run Desktop Cat" ticked and finish. The cat appears above your taskbar.

Requires Windows 10 or 11. If WebView2 is missing (some Windows 10 PCs), the installer fetches it, so an internet
connection is needed once, during installation. After that the app works fully offline.

**Updating:** run the newer installer over the old one. Your progress is kept.

**Uninstalling:** Settings → Apps → Installed apps → Desktop Cat. The uninstaller has a "Delete the application data"
checkbox, **off by default**, so your collection is kept unless you tick it. Uninstalling also removes the "launch at
startup" entry.

---

## Using Desktop Cat

- **Click the cat** to pet it. **Click a gem** to pick it up.
- **Tray icon** (bottom right, maybe under the ^ arrow), right-click for: Open control panel · Hide/Show cat ·
  Pause/Resume · Switch to click-through/interactive mode · Exit Desktop Cat. Closing the control panel never stops the
  cat; only **Exit** (or the Quit button in Settings) does.
- **Click-through mode** makes the cat ignore clicks entirely. You can always switch it back from the tray or the control
  panel. (While it is on you can't pick up gems by hand, but they still collect themselves after 2 minutes.)
- Only **one cat runs at a time**. Starting the app again just opens the control panel of the one that's running.

**Control panel** (tray → Open control panel):

| Page | What's there |
|---|---|
| **Home** | Mood, what the cat is doing, personality bars, Pet / Play / Inspect, recent activity |
| **Collection** | Progress, treasure grid, set progress, recent finds |
| **Appearance** | Live preview, fur colour, wear or remove cosmetics |
| **Settings** | Show, pause, click-through, hide during fullscreen apps, sound, calm mode, launch at startup, shortcuts, About, start over (type RESET), quit |

**Keyboard shortcuts** (control panel focused): `1`-`4` switch pages · `P` pet · `L` play · `I` inspect · `H` hide or
show. Nothing listens to the keyboard globally.

**If the cat ignores your clicks:** you probably turned on click-through mode. Use the tray menu → "Switch to
interactive mode". **If you can't see the cat:** check the tray menu for "Show cat", and whether a fullscreen app is open.

---

## Build from source

### Requirements

Windows 10 or 11 (Windows 11 is the main target). From PowerShell:

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Rustlang.Rustup -e
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

The Build Tools download is several GB and can take 10-30 minutes. Then open a **new** PowerShell and check:

```powershell
git --version; node --version; npm --version; rustc --version; cargo --version
rustup default stable-x86_64-pc-windows-msvc
```

WebView2 is already part of Windows 11 (Windows 10 may need the Evergreen runtime). Use a **normal, non-admin** shell.
You also need **Python 3 with Pillow** once, to prepare the artwork (next step).

### 1. Get the repository

```powershell
git clone https://github.com/OWNER/REPO.git     # replace OWNER/REPO with this repository's address
cd REPO
```

### 2. Get the artwork (required, not in the repository)

The cat sprites are not in this repository (see [Art assets and licensing](#art-assets-and-licensing)). Get the pack,
**read its licence**, and build the sheets the app uses:

```powershell
pip install pillow
python tools\prepare-art.py "C:\path\to\Cats Download.zip"
```

This writes 50 files to `public\cats\`. The script checks that every colour the app expects is present. Without them the
app still builds, but the cat is invisible.

The app icon in `src-tauri\icons\` is also made from the cat sprite, so it is subject to the same licence.

### 3. Install and run

```powershell
npm install
npm run tauri dev
```

The first run compiles all the Rust dependencies, which takes several minutes. Later runs are fast.

### Commands

| What | Command |
|---|---|
| Install JavaScript dependencies | `npm install` |
| Run the app in development | `npm run tauri dev` |
| Run the unit tests | `npm test` |
| Type-check the TypeScript | `npx tsc --noEmit` |
| Check the Rust compiles | `cargo check --manifest-path src-tauri/Cargo.toml` |
| Build the Windows installer | `npm run tauri build` |
| Build the artwork sheets | `python tools\prepare-art.py "<path to the zip>"` |

Stop the dev app with Ctrl+C. Quit the tray app before rebuilding.

### Troubleshooting

- *`unresolved import tauri_plugin_autostart` / `tauri_plugin_single_instance`*: a Rust dependency is missing. Run
  `cd src-tauri` then `cargo add tauri-plugin-autostart@2` and `cargo add tauri-plugin-single-instance@2`.
- *Unknown `windows_sys` items*: the `windows-sys` line in `src-tauri\Cargo.toml` needs these features:
  `windows-sys = { version = "0.59", features = ["Win32_Foundation", "Win32_UI_WindowsAndMessaging", "Win32_UI_Shell", "Win32_System_Registry"] }`
  (under `[target.'cfg(windows)'.dependencies]`).
- *The cat doesn't appear*: did you run `prepare-art.py`? Check the tray icon, and run in a terminal so any Rust panic
  message is visible.
- *Odd permission errors*: don't run the dev tools in an Administrator shell.
- *Launch at startup in dev*: it registers the exe you're running (the dev build). Test it in the installed app.
- *Tests*: they need neither the artwork nor Rust, so `npm test` works on any machine with Node.

---

## Releasing

1. Confirm the art licence and record it in [`THIRD_PARTY.md`](THIRD_PARTY.md).
2. Bump `"version"` in `src-tauri/tauri.conf.json`. The installer name and Settings → About come from it.
3. Run `npm test` and `npx tsc --noEmit`; both must pass.
4. Quit the tray app and any dev server, then run `npm run tauri build`.
5. Run the [release checklist](#release-checklist), ideally on a second PC.
6. On GitHub: **Releases → Draft a new release**, create a tag such as `v0.9.0`, attach
   `src-tauri\target\release\bundle\nsis\Desktop Cat_<version>_x64-setup.exe` (and optionally `USER_GUIDE.md`), and
   publish. Mention in the notes that the installer is unsigned.

The installer lands in `src-tauri\target\release\bundle\nsis\`. Share that file, not the bare program from
`target\release`.

What is configured (`src-tauri/tauri.conf.json`): product name and version, publisher and descriptions, the cat app icon,
NSIS installer only, per-user install, the WebView2 bootstrapper embedded in the installer, and an uninstall hook
(`src-tauri/installer-hooks.nsi`) that removes the startup entry.

*Optional later:* a **code-signing certificate** removes the "unknown publisher" warning. It costs money, so it is only
worth it for wide distribution.

### Release checklist

Do this on a PC that has **not** been used for development if you can (a spare PC or a Windows virtual machine).

| # | Test | Expected |
|---|---|---|
| 1 | Run the installer | No administrator prompt; installs; "Run Desktop Cat" at the end starts the cat |
| 2 | First start | Cat appears, tray icon has the cat icon, collection empty |
| 3 | Start the app a second time (Start menu) | No second cat; the control panel of the first one opens |
| 4 | Settings → Launch at startup on; sign out and in (or restart) | Cat starts by itself |
| 5 | Windows Settings → Apps → Startup | "Desktop Cat" is listed while enabled, gone when disabled in the app |
| 6 | Find something, wear an item, change colour, quit, start again | Everything is remembered |
| 7 | Install the same installer again over the top | Works; progress kept |
| 8 | Check `%LOCALAPPDATA%\com.desktopcat.app` | `save.json` is there |
| 9 | Uninstall without ticking "Delete the application data" | App gone; startup entry gone; `save.json` kept |
| 10 | Reinstall | Collection is back |
| 11 | Uninstall with "Delete the application data" ticked | Folder gone |
| 12 | Windows 10 PC without WebView2 (if available) | Installer installs it; app starts |
| 13 | Work through the [Windows manual test checklist](#manual-test-checklist-windows) | All pass |
| 14 | Settings → About | Shows the right version number |

### Tidying the project

Two optional helper scripts live in `tools/`. Run them from the project folder (the one containing `src-tauri`), with the
dev server stopped:

```powershell
powershell -ExecutionPolicy Bypass -File tools\tidy.ps1              # removes unused template files
powershell -ExecutionPolicy Bypass -File tools\rename-internals.ps1  # renames the internal name "spike" to "desktop-cat"
```

`rename-internals.ps1` changes the package name, the Rust crate name and `main.rs` (backups go to `.rename-backup`).
Run it only when the app builds and runs. The first build afterwards recompiles for a few minutes. Renaming the
**folder** itself is always safe: close terminals and editors, then rename it in File Explorer.

---

## How it works

<details>
<summary><b>Windows and click-through</b></summary>

| Window | Purpose |
|---|---|
| `main` (overlay) | Transparent, borderless, always-on-top, hidden from the taskbar. A thin strip along the bottom of the primary monitor's work area (above the taskbar). The cat is drawn on a canvas inside it. Owns the simulation. |
| `control` | A normal window, created on demand and destroyed when closed, so it costs nothing while closed. |

**Click-through.** Windows can only make a whole window click-through or not. So the overlay starts click-through, and a
Rust thread reads the **pointer position only** and turns clicks on only while the pointer is over the cat or a dropped
gem. It polls about 8 times a second while the pointer is far from the strip, and 25 times a second only when it is
near. Hidden, paused or in click-through mode, it checks only every 250 ms.

**The watcher.** All of this runs on one background thread (`watcher.rs`) that is **supervised**: if it ever panics it is
restarted automatically, so click handling can't silently die.

**Display changes.** Every 2 seconds Rust compares the work area and display scaling, and moves the strip back where it
belongs if either changed. The page re-picks its pixel scale when the window resizes. The strip always uses the
**primary** monitor's work area, so it stays above a bottom taskbar and at the screen edge for a top, left or right one.

**Fullscreen apps.** Once a second Rust asks Windows (`SHQueryUserNotificationState`) whether a fullscreen app, Direct3D
game or presentation is in front. If so (and the setting is on), the cat is *auto-hidden*: invisible, click-through and
not running, like Hide, but without touching your own Hide setting.

**Taskbar awareness.** `native.rs` reads the taskbar edge and auto-hide state (`SHAppBarMessage`) and whether icons are
left-aligned (Windows 10 always; Windows 11 from the `TaskbarAl` registry value). Changes reach the page as
`platform-changed`, which moves the "ponder over the icons" spot.

**Crisp pixels.** The sprite scale is a whole number of *physical* pixels chosen from the display scaling (4× at 100%,
5× at 125%, 6× at 150%), with image smoothing off.

**Time.** The simulation advances in capped steps (500 ms max), so waking from sleep never causes a catch-up burst.

</details>

<details>
<summary><b>State ownership, events and commands</b></summary>

- **One simulation**, in the overlay page (`src/main.ts` + `src/simulation/catEngine.ts`). The control panel only sends
  requests and displays what the overlay publishes.
- **Rust** owns: native window work, the tray, the on/off flags (visible, paused, click-through, auto-hidden), the click
  areas, autostart, single-instance, and all save-file reads and writes.
- **TypeScript** owns: gameplay rules, behaviour selection, treasures, validation of saved data.

Events (the overlay validates anything it receives against fixed lists):

| Event | From → to | Meaning |
|---|---|---|
| `settings-changed` | Rust → all | visible / paused / click_through / auto_hidden / hide_in_fullscreen changed |
| `platform-changed` | Rust → overlay | taskbar edge, auto-hide or icon alignment changed |
| `cat-cursor` | Rust → overlay | pointer near the strip (position only) |
| `cat-before-quit` | Rust → overlay | flush the save, we're exiting |
| `cat-status` | overlay → control | mood, behaviour, traits |
| `cat-collection` | overlay → control | inventory, history, sets, cosmetics, pending gem |
| `cat-prefs` | overlay → control | saved preferences |
| `cat-activity` | overlay → control | recent activity list |
| `cat-status-request` | control → overlay | "send me everything" |
| `cat-action` | control → overlay | pet / play / inspect |
| `cat-pref` | control → overlay | change a preference |
| `cat-equip` | control → overlay | wear / remove a cosmetic |
| `cat-reset` | control → overlay | erase progress (must carry the word RESET) |

Rust commands: `get_settings`, `toggle_setting`, `set_hit_rects`, `apply_saved_settings`, `set_hide_in_fullscreen`,
`get_platform_info`, `quit_app`, `get_autostart`, `set_autostart`, `load_game`, `save_game`, `reset_game`,
`quarantine_save`.

Tauri plugins: `tauri-plugin-autostart`, `tauri-plugin-single-instance`. Permissions are least-privilege
(`core:default` only).

</details>

<details>
<summary><b>Personality (<code>catEngine.ts</code>)</b></summary>

- Behaviours: idle, walk, look, nap, play, celebrate, ponder, discover. Each has a base "what comes next" table that never
  lists itself, multiplied by trait weights and mood weights. Naps, plays and ponders have cooldowns.
- Moods are rolled from traits, time of day and recent interactions, and expire after a minute or two.
- Randomness and the clock are injected, so behaviour is unit-tested with seeded random numbers.
- *Calm* intensity: 30% slower, a quarter as many runs, no mid-walk changes of mind.
- Interactions nudge traits by one point, bounded to 0-100. Too many pets in 20 seconds make the cat grumpy for 40 seconds.

</details>

<details>
<summary><b>Treasures (<code>treasures.ts</code>, <code>treasureSystem.ts</code>, <code>drops.ts</code>)</b></summary>

- Finds happen at "opportunities" (the end of a walk, look, ponder or play) with a small chance, shaped by curiosity and
  mood, with a minimum gap between finds. Tuned to roughly one find every 7-8 minutes of running time; a full collection
  takes around 11 hours of running time on average.
- Rarity weights: common 70, uncommon 22, rare 7, legendary 1. The special item comes from a milestone (25 finds).
- A find first becomes a **pending drop** (saved, so it survives a restart). Clicking it, or 2 minutes passing, adds it to
  the inventory. Duplicates raise a count; cosmetics are never duplicated.
- Away rolls: one roll per 20 minutes away, 8 hours counted at most, at most 5 finds.

</details>

<details>
<summary><b>Saving (<code>saveData.ts</code>, <code>persistence.ts</code>, <code>persistence.rs</code>)</b></summary>

- A single versioned JSON file. The page serialises it; Rust writes it **atomically** (temp file → flush → keep the
  previous copy as `.bak` → rename). Writes are coalesced to at most one every 2 seconds, and never per frame.
- On load everything is **validated and repaired** (unknown items dropped, numbers clamped, collections and cosmetics
  re-derived), so one bad field never costs the collection.
- A file that can't be understood is **set aside** (never deleted) and a fresh save starts. A save from a *newer* app
  version is refused rather than damaged. If the file can't be read at all, saving is disabled so it isn't overwritten.
- Migrations are supported (`MIGRATIONS` in `saveData.ts`, empty until the format changes).

</details>

<details>
<summary><b>Cosmetics (<code>cosmetics.ts</code>, <code>anchors.ts</code>, <code>catPainter.ts</code>)</b></summary>

- `anchors.ts` holds the measured head and neck position for every frame (identical for all 50 colours).
- Each cosmetic is a list of pixels placed relative to those anchors. "Masked" pixels (the collar) only recolour the cat's
  own fur; the rest (bow, leaves, bell) may stick out.
- `CatPainter` draws the frame, then the accessories, on a small scratch canvas and copies it over, so nothing else on
  screen is affected. It is used by both the overlay and the Appearance preview.
- One item per spot (head or neck). Worn items are saved.

</details>

---

## Project structure

```
.
├── index.html                  overlay page (one transparent canvas)
├── control.html                control panel page (all four tabs and their styling)
├── vite.config.ts              two entry pages: index.html and control.html
├── public/cats/                the 50 colour sheets (generated by tools/prepare-art.py, not in git)
├── src/
│   ├── main.ts                 overlay: render loop, interactions, discoveries, events, saving
│   ├── control.ts              control panel: rendering, events, shortcuts
│   ├── render/catPainter.ts    draws a frame plus cosmetics
│   ├── services/
│   │   ├── persistence.ts      load/create/recover logic, write scheduler, Tauri bridge
│   │   └── sound.ts            tiny synthesized sound effects
│   └── simulation/             pure logic: no DOM, no Tauri, all unit-tested
│       ├── animation.ts        animation table, frame lookup, pixel scale
│       ├── catEngine.ts        behaviour, moods, traits, movement, interactions
│       ├── treasures.ts        catalogue, sets, rarity weights
│       ├── treasureSystem.ts   discovery odds, drops, away rolls
│       ├── drops.ts            where drops land, click area
│       ├── saveData.ts         save model, validation, migrations
│       ├── cosmetics.ts        cosmetic list, equip rules, accessory pixels
│       ├── anchors.ts          head/neck positions per frame
│       ├── catSheets.ts        list of the 50 colours
│       ├── platform.ts         taskbar info type and the ponder zone it implies
│       └── activity.ts         recent-activity list
├── src-tauri/
│   ├── tauri.conf.json         window, bundle, version and installer settings
│   ├── installer-hooks.nsi     installer extras (removes the startup entry on uninstall)
│   ├── icons/                  the app icon in every size Windows needs
│   ├── capabilities/           least-privilege permissions per window
│   └── src/
│       ├── lib.rs              overlay placement, tray, settings state, commands, plugins
│       ├── native.rs           Windows queries: work area, pointer, fullscreen, taskbar
│       ├── watcher.rs          supervised background thread: click-through, display changes, fullscreen
│       ├── persistence.rs      atomic save/load/reset/quarantine
│       └── main.rs             entry point
├── tools/
│   ├── prepare-art.py          builds public/cats from the artwork pack
│   ├── tidy.ps1                removes unused template files (optional)
│   └── rename-internals.ps1    renames the internal name "spike" to "desktop-cat" (optional)
├── tests/                      Vitest unit tests
├── .github/workflows/ci.yml    type-check + tests, and a Windows Rust build check
├── USER_GUIDE.md               one-page guide for the people you share it with
├── THIRD_PARTY.md              software and art credits and licences
└── README.md                   this file
```

---

## Art assets and licensing

> ⚠️ **The cat artwork is not covered by this project's licence and is not included in this repository.**

The sprites come from a third-party pack named `Cats Download.zip`. When it was inspected it contained **no licence
file**, so its terms (credit? commercial use? redistribution?) are **unknown**. Until you have checked them on the pack's
original page:

- do **not** commit `public/cats/` or the original zip. `.gitignore` already excludes `public/cats/` and `assets-source/`.
  If the licence allows redistribution, delete those two lines from `.gitignore`;
- remember that `src-tauri/icons/` and the cosmetics' placement data are derived from the sprite too;
- do not distribute built installers outside people you trust, because they contain the artwork.

Record the author, source link and licence in [`THIRD_PARTY.md`](THIRD_PARTY.md) once you know them.

What the pack contains (found by inspecting it):

- 50 base colour sheets, plus 14 marking overlays (not used yet).
- Each sheet is 1024×544 RGBA with a transparent background; only the left 768 px are used. The top 32 px are a text
  header, which is cropped away. Below it is a 32×32 frame grid, 24 columns × 16 rows.
- Six animation blocks of four columns: sitting down (6 frames), looking around (5), laying down (8), walking (4),
  running (5), running 2.0 (8). Frames 5+ continue on the next row.
- Eight facing directions, as pairs of rows. The app uses **left** (rows 4-5) and **right** (rows 12-13).
- All 50 sheets share exactly the same silhouettes and frame layout, so colours are interchangeable.
- No timing data comes with the pack, so frame durations were chosen by eye.

Everything else visual is original to this project: the collection icons are emoji from the viewer's own system font, and
the heart, question mark, sparkles, gem and accessories are small shapes drawn in code.

---

## Data, privacy and security

- Everything is stored locally. The app makes **no network requests** and has **no telemetry**. After installation it works
  fully offline.
- Save file: `%LOCALAPPDATA%\com.desktopcat.app\save.json` (plus `save.json.bak`, and set-aside files named `*.corrupt-*`
  or `*.unreadable-*` if something was ever unreadable).
- Saved: cat name and traits, inventory, find history (last 200), pending gem, unlocked and worn cosmetics, completed sets,
  preferences. Not saved: animation state, mood, window state.
- To reset: Settings → Start over (type RESET). Preferences are kept. Or delete the folder above while the app is closed.
- The cat only *reads* the pointer position; it never moves it, clicks, types, or listens to the keyboard globally.
  It does not touch your files.
- Tauri permissions are least-privilege: `core:default` only. No shell, filesystem or process access from the pages, no
  remote scripts or pages.
- **Reporting a security problem:** please use GitHub's private "Report a vulnerability" option on the repository's
  Security tab rather than a public issue.

---

## Testing

`npm test` runs the Vitest suite (**122 tests** in 8 files), and `npx tsc --noEmit` type-checks the TypeScript. Neither
needs the artwork or Rust. They cover: sprite maths, behaviour selection and weights, traits and moods, time of day,
cooldowns, movement bounds, catch-up caps, interactions, cursor curiosity, treasure odds and rarity distribution,
milestones, drops, away rolls, set completion, save validation, repair and migrations, the write scheduler and
load/recover flow, sound, the activity list, animation intensity, colour list safety, cosmetics, head and neck positions
for every frame, the taskbar-aware ponder zone, and the fullscreen preference.

**Continuous integration** (`.github/workflows/ci.yml`) runs on every push and pull request: the type-check and unit
tests on Linux, and `cargo check` of the Rust code on Windows (the native code is Windows-specific, so it has to be
checked there).

**Not covered by automated tests (checked by hand on Windows):** transparency, click-through behaviour, the tray, the
taskbar position, display scaling and resolution changes, sleep and resume, autostart, the installer, and how the control
panel looks. The Rust code has no unit tests yet.

### Manual test checklist (Windows)

Run through this after installing a new build. "Within a few seconds" means up to about 2 s, since the watcher checks
display and taskbar changes every 2 s and fullscreen every 1 s.

| # | Test | Expected |
|---|---|---|
| 1 | Start the app | Cat appears above the taskbar; background fully transparent; tray icon present |
| 2 | Click and type in windows behind the strip, including right next to the cat | Everything works normally; only the cat itself takes clicks |
| 3 | Click the cat | Heart appears; Recent activity updates |
| 4 | Play a video fullscreen (browser F11 or the player's fullscreen button) | Cat disappears within a few seconds; returns when you leave fullscreen |
| 5 | Settings → turn off "Hide during fullscreen apps", repeat 4 | Cat stays visible over the video |
| 6 | Windows 11: Settings → Personalization → Taskbar → Taskbar behaviours → alignment Left, then Centre | At its next ponder the cat goes to the matching area (left or middle) |
| 7 | Turn on taskbar auto-hide | Cat stands at the very bottom of the screen; the taskbar slides over it (known) |
| 8 | Change display scaling 100% → 125% → 150% and back | Cat stays on screen above the taskbar within a few seconds and stays sharp |
| 9 | Change screen resolution | Cat repositions and stays within the screen |
| 10 | Sleep the PC, wake it, wait a minute | Cat carries on normally, no jump or burst of activity; strip in the right place |
| 11 | Lock the screen (Win+L) and sign back in | Cat carries on |
| 12 | Switch on click-through mode, then recover it from the tray and from the control panel | Cat ignores clicks, then reacts again |
| 13 | Hide, pause, resume from tray and control panel | States match in both places |
| 14 | Close the control panel | Cat keeps running |
| 15 | Exit from the tray, restart | Collection, colour, worn items and settings are all still there |
| 16 | Task Manager → Details: watch `Desktop Cat` and its `msedgewebview2` processes for a few minutes, while the cat sits and while it walks | Note CPU % and memory for each |
| 17 | (If you have a second monitor) Plug and unplug it, or change which one is primary | Cat stays on the primary monitor, on screen |

---

## Known limitations

- **Primary monitor only.** The cat never wanders onto other monitors.
- The ponder spot is an *estimate* of where the taskbar icons are (the middle for centred icons, the left for left-aligned
  ones; `platform.ts`). Real icon positions would need Windows UI Automation.
- With the taskbar set to auto-hide, the cat stands at the very bottom of the screen and the taskbar slides over it.
- Fullscreen detection relies on Windows' own report; a few apps that fake fullscreen with a borderless window may not be
  detected.
- There is no stand-up animation after lying down, so the cat just switches to sitting.
- The discovery chime may stay silent until you've clicked the cat once (webviews block sound before interaction).
- The cat's name is fixed ("Mochi").
- The installer is unsigned (SmartScreen warning).
- The version stays 0.9.0 until the release checklist has been completed on a clean PC.
- The art pack's licence is unconfirmed (see above).
- The Rust code has no unit tests yet; it is checked by compiling it on Windows (including in CI) and by hand.

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation, asset inspection, Tauri + TypeScript + Vite setup | ✅ done |
| 1 | Transparent overlay, tray, click-through, control window, first animation, display changes | ✅ done |
| 2 | All six animations and weighted wandering | ✅ done |
| 3 | Moods, traits, interactions, time of day, cursor curiosity | ✅ done |
| 3+ | Pondering over the taskbar icons | ✅ done |
| 4A | Treasures, discovery, away finds, saving, collection, reset | ✅ done |
| 4B | Physical drops you click to collect | ✅ done |
| 5 | Control panel pages, colours, sound, shortcuts, startup setting, activity | ✅ done |
| 5B | Wearable cosmetics | ✅ built, needs wider testing |
| 6A | Robustness: fullscreen apps, taskbar awareness, supervised watcher, lighter polling, test checklist | ✅ built, needs wider testing |
| 6B | Release: icon, installer settings, one-copy-at-a-time, uninstall hook, About, scripts, user guide | ✅ built, needs wider testing |
| 6C | Confirm the art licence; run the release checklist on a clean PC; set version 1.0.0 | ⏳ next |
| 7 | Ideas (not required): naming the cat, quiet hours, save export/import, dragging, themed sets, multi-monitor, real icon positions | 💡 |

---

## Changelog

Newest first.

**GitHub preparation**
- This README rewritten for GitHub: install, build from source, releasing, architecture, testing, privacy, contributing.
- `tools/prepare-art.py` builds the colour sheets from the artwork pack; the artwork is kept out of git by `.gitignore`.
- Added `.github/workflows/ci.yml` (type-check, unit tests, Windows `cargo check`).

**Phase 6B: Release preparation (version 0.9.0)**
- New app icon (the cat, with ribbon and collar) in every size; the tray icon uses it too.
- Installer: per-user, no administrator rights, WebView2 bootstrapper embedded, NSIS only, product name, publisher and
  descriptions set; `npm run tauri build` builds just the installer.
- Uninstalling removes the "launch at startup" entry.
- Only one copy of the app runs at a time (`tauri-plugin-single-instance`); starting it again opens the control panel.
- Settings has an About section with the version and the data location.
- Added `USER_GUIDE.md`, `THIRD_PARTY.md`, the release checklist and the optional `tools/` scripts.

**Phase 6A: Robustness**
- Hides while a fullscreen app, game or presentation is in front (setting, on by default).
- Reads the taskbar (edge, auto-hide, icon alignment) and ponders where the icons really are.
- The watcher lives in `watcher.rs` on a supervised thread that restarts itself after a crash; Windows queries moved to
  `native.rs`.
- Pointer polling drops to about 8 times a second while the pointer is far from the strip.
- Added the Windows manual test checklist.

**Phase 5B: Wearable cosmetics**
- Red Ribbon, Leaf Crown and Bell Collar, drawn on every frame of every animation, both directions, any colour.
- Measured head and neck positions for all 70 frames (`anchors.ts`).
- Appearance page: live preview and Wear/Remove buttons. Worn items are saved.

**Phase 5: Control panel and polish**
- Control panel rebuilt as four pages with transitions, empty and error states, keyboard shortcuts and toasts.
- 50 fur colours, sound effects, Calm/Normal intensity, launch at startup.
- Item reveal label on pickup, recent activity feed.

**Phase 4B: Physical drops**
- Finds are left on the ground as a twinkling gem; click to collect, or they collect after 2 minutes. Saved across restarts.

**Phase 4A: Treasures and saving**
- 16 treasures, rarity weights, 3 sets with cosmetic rewards, discovery pacing, away finds.
- Versioned, validated, atomically written save file; Start over with typed confirmation.

**Pondering**
- New behaviour: walk to the icon area, sit, thinking "?" above the head.

**Phase 3: Personality**
- Moods, five traits, time of day, cursor curiosity, pet/play/inspect, heart effect.

**Phase 2: Behaviour**
- All six animations, weighted wandering, no repeats.

**Phase 1: Overlay**
- Transparent strip overlay with pointer-position click-through, tray menu, on-demand control window, display-change
  handling, first walking cat.

**Phase 0: Foundation**
- Asset inspection, Tauri 2 + TypeScript + Vite project.

---

## Contributing

Contributions and bug reports are welcome.

**Reporting a bug.** Please include: your Windows version and build, your display scaling and whether you use more than
one monitor, whether your taskbar icons are centred or left-aligned, the app version (Settings → About), what you did,
what you expected, and what happened. A screenshot helps. If the app crashed, include any text from a terminal if you were
running `npm run tauri dev`.

**Setting up.** Follow [Build from source](#build-from-source). Day to day:

```powershell
npm test                      # unit tests
npx tsc --noEmit              # type-check
cargo check --manifest-path src-tauri/Cargo.toml   # Rust compiles
npm run tauri dev             # run it
```

**Guidelines**
- Keep game logic in `src/simulation/` as pure functions (no DOM, no Tauri), with randomness and time injected, and add a
  unit test with it. Anything that touches Windows goes in `src-tauri/src/native.rs` or `watcher.rs`.
- The cat must never move the mouse, simulate clicks, type, capture keystrokes globally, or touch the user's files. Keep
  the Tauri permissions minimal, and don't add network access or telemetry.
- Keep the project compiling. Run the tests, the type-check and `cargo check` before opening a pull request.
- Don't write saves per frame; use the write scheduler. Anything added to the save needs validation in `saveData.ts` and a
  test, and older saves must still load.
- **Don't commit the artwork** (see [Art assets and licensing](#art-assets-and-licensing)).
- Update this README for any user-visible change: the relevant section, the roadmap, the changelog, the test count and the
  known limitations.

---

## License and credits

**Code:** no licence has been chosen yet. Until one is added, all rights are reserved by the author. To make the code open
source, add a `LICENSE` file (MIT or Apache-2.0 are common choices) and update this section. **A code licence does not
cover the artwork.**

**Artwork:** the cat sprites are from a third-party pack. Author, source and licence are to be recorded in
[`THIRD_PARTY.md`](THIRD_PARTY.md) once confirmed.

**Built with:** [Tauri](https://tauri.app), TypeScript, [Vite](https://vitejs.dev) and [Vitest](https://vitest.dev); the Rust
crates `serde`, `serde_json` and `windows-sys`; and the Tauri plugins `autostart` and `single-instance`. Full list and
licences in [`THIRD_PARTY.md`](THIRD_PARTY.md).

---

## Maintaining this README

This file is updated whenever the project changes. For each change update: **Status**, the affected sections, the
**Roadmap** row, the **Changelog** (newest first), the test count, and **Known limitations** (add new ones, remove fixed
ones).
<div align="center">

# Desktop Cat 🐈

**A small, cozy, slightly mischievous pixel-art cat that lives on your Windows desktop.**

It wanders along the top of your taskbar, sits, naps, runs about, ponders, finds little treasures, and remembers
everything between sessions. It never needs feeding and never nags.

![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D4)
![Built with Tauri 2](https://img.shields.io/badge/built%20with-Tauri%202-24C8DB)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6)
![Rust](https://img.shields.io/badge/Rust-stable-DEA584)
![Version](https://img.shields.io/badge/version-0.9.0-2EA043)
![Local only](https://img.shields.io/badge/data-100%25%20local-8957E5)
<!-- After you publish the repo, replace OWNER/REPO below and remove this comment: -->
<!-- ![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg) -->

</div>

<!--
  Screenshots: take a few (the cat on your desktop, the control panel's Home and Collection pages, Appearance), save them
  in docs/images/, and add them here, for example:
  ![Desktop Cat on the taskbar](docs/images/screenshot.png)
-->

> **Status:** version **0.9.0**, a release candidate. Every planned feature is built. Parts of it still need testing on
> more PCs. See the [release checklist](#release-checklist) and the [roadmap](#roadmap).
>
> ⚠️ **About the artwork:** the cat sprites come from a third-party pack whose licence has **not been confirmed**, so they
> are **not included in this repository**. See [Art assets and licensing](#art-assets-and-licensing) before you build,
> share or redistribute anything.

---

## Contents

- [Highlights](#highlights)
- [Download and install](#download-and-install)
- [Using Desktop Cat](#using-desktop-cat)
- [Build from source](#build-from-source)
- [Releasing](#releasing)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Art assets and licensing](#art-assets-and-licensing)
- [Data, privacy and security](#data-privacy-and-security)
- [Testing](#testing)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [License and credits](#license-and-credits)

---

## Highlights

**A cat with a personality**
- Lives in a thin, fully transparent strip above your taskbar. Clicks pass straight through to the windows behind it;
  only the cat itself takes clicks.
- Uses all six animations in the art pack: sitting down, looking around, lying down, walking, running, running 2.0.
- Chooses what to do by weighted odds (never the same thing twice in a row), shaped by five **moods** (happy, curious,
  sleepy, playful, grumpy) and five **traits** (curiosity, playfulness, affection, laziness, mischief).
- Gets sleepier late at night, and turns to look at your mouse pointer when it comes near. Curious cats sometimes
  wander over to watch it.
- **Ponders** over the taskbar icons: walks to where they are, sits, and a thinking "?" bobs above its head. It knows
  whether your icons are centred or left-aligned.
- Reacts to being petted (a heart floats up), to play and to inspect. Too much fuss makes it grumpy for a while, and it
  just ignores you. It never punishes you for ignoring it.
- Steps aside while a **fullscreen** video, game or presentation is in front, and comes back afterwards.

**Treasures to find**
- 16 collectable treasures (8 common, 4 uncommon, 2 rare, 1 legendary, 1 special) in three sets.
- After walks, looks, pondering and play, the cat has a small chance to find something. It sparkles and leaves a shiny
  gem on the ground. **Click the gem** to see what it was. Unclaimed finds collect themselves after 2 minutes.
- **While you were away**: finds are also rolled for time the app was closed or the PC slept (capped at 8 hours and 5 finds).
- Completing a set unlocks a cosmetic.

**Make it yours**
- 50 fur colours.
- Wearable cosmetics, drawn on every frame of every animation, facing both ways: Red Ribbon, Leaf Crown, Bell Collar.
- Settings for sound, calm mode, hide during fullscreen apps, click-through mode and launch at startup.

**Everything stays on your PC.** No accounts, no network, no telemetry. The cat only *reads* your pointer position;
it never moves your mouse, clicks, types, or listens to your keyboard.

---

## Download and install

> Installers are published on the repository's **Releases** page (see [Releasing](#releasing)). A short guide for people
> you share it with is in [`USER_GUIDE.md`](USER_GUIDE.md).

1. Download `Desktop Cat_<version>_x64-setup.exe` and run it. It installs for the current user only, with no
   administrator rights.
2. Windows may show **"Windows protected your PC"**, because the installer isn't code-signed. Click **More info**, then
   **Run anyway**.
3. Leave "Run Desktop Cat" ticked and finish. The cat appears above your taskbar.

Requires Windows 10 or 11. If WebView2 is missing (some Windows 10 PCs), the installer fetches it, so an internet
connection is needed once, during installation. After that the app works fully offline.

**Updating:** run the newer installer over the old one. Your progress is kept.

**Uninstalling:** Settings → Apps → Installed apps → Desktop Cat. The uninstaller has a "Delete the application data"
checkbox, **off by default**, so your collection is kept unless you tick it. Uninstalling also removes the "launch at
startup" entry.

---

## Using Desktop Cat

- **Click the cat** to pet it. **Click a gem** to pick it up.
- **Tray icon** (bottom right, maybe under the ^ arrow), right-click for: Open control panel · Hide/Show cat ·
  Pause/Resume · Switch to click-through/interactive mode · Exit Desktop Cat. Closing the control panel never stops the
  cat; only **Exit** (or the Quit button in Settings) does.
- **Click-through mode** makes the cat ignore clicks entirely. You can always switch it back from the tray or the control
  panel. (While it is on you can't pick up gems by hand, but they still collect themselves after 2 minutes.)
- Only **one cat runs at a time**. Starting the app again just opens the control panel of the one that's running.

**Control panel** (tray → Open control panel):

| Page | What's there |
|---|---|
| **Home** | Mood, what the cat is doing, personality bars, Pet / Play / Inspect, recent activity |
| **Collection** | Progress, treasure grid, set progress, recent finds |
| **Appearance** | Live preview, fur colour, wear or remove cosmetics |
| **Settings** | Show, pause, click-through, hide during fullscreen apps, sound, calm mode, launch at startup, shortcuts, About, start over (type RESET), quit |

**Keyboard shortcuts** (control panel focused): `1`-`4` switch pages · `P` pet · `L` play · `I` inspect · `H` hide or
show. Nothing listens to the keyboard globally.

**If the cat ignores your clicks:** you probably turned on click-through mode. Use the tray menu → "Switch to
interactive mode". **If you can't see the cat:** check the tray menu for "Show cat", and whether a fullscreen app is open.

---

## Build from source

### Requirements

Windows 10 or 11 (Windows 11 is the main target). From PowerShell:

```powershell
winget install --id Git.Git -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Rustlang.Rustup -e
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

The Build Tools download is several GB and can take 10-30 minutes. Then open a **new** PowerShell and check:

```powershell
git --version; node --version; npm --version; rustc --version; cargo --version
rustup default stable-x86_64-pc-windows-msvc
```

WebView2 is already part of Windows 11 (Windows 10 may need the Evergreen runtime). Use a **normal, non-admin** shell.
You also need **Python 3 with Pillow** once, to prepare the artwork (next step).

### 1. Get the repository

```powershell
git clone https://github.com/OWNER/REPO.git     # replace OWNER/REPO with this repository's address
cd REPO
```

### 2. Get the artwork (required, not in the repository)

The cat sprites are not in this repository (see [Art assets and licensing](#art-assets-and-licensing)). Get the pack,
**read its licence**, and build the sheets the app uses:

```powershell
pip install pillow
python tools\prepare-art.py "C:\path\to\Cats Download.zip"
```

This writes 50 files to `public\cats\`. The script checks that every colour the app expects is present. Without them the
app still builds, but the cat is invisible.

The app icon in `src-tauri\icons\` is also made from the cat sprite, so it is subject to the same licence.

### 3. Install and run

```powershell
npm install
npm run tauri dev
```

The first run compiles all the Rust dependencies, which takes several minutes. Later runs are fast.

### Commands

| What | Command |
|---|---|
| Install JavaScript dependencies | `npm install` |
| Run the app in development | `npm run tauri dev` |
| Run the unit tests | `npm test` |
| Type-check the TypeScript | `npx tsc --noEmit` |
| Check the Rust compiles | `cargo check --manifest-path src-tauri/Cargo.toml` |
| Build the Windows installer | `npm run tauri build` |
| Build the artwork sheets | `python tools\prepare-art.py "<path to the zip>"` |

Stop the dev app with Ctrl+C. Quit the tray app before rebuilding.

### Troubleshooting

- *`unresolved import tauri_plugin_autostart` / `tauri_plugin_single_instance`*: a Rust dependency is missing. Run
  `cd src-tauri` then `cargo add tauri-plugin-autostart@2` and `cargo add tauri-plugin-single-instance@2`.
- *Unknown `windows_sys` items*: the `windows-sys` line in `src-tauri\Cargo.toml` needs these features:
  `windows-sys = { version = "0.59", features = ["Win32_Foundation", "Win32_UI_WindowsAndMessaging", "Win32_UI_Shell", "Win32_System_Registry"] }`
  (under `[target.'cfg(windows)'.dependencies]`).
- *The cat doesn't appear*: did you run `prepare-art.py`? Check the tray icon, and run in a terminal so any Rust panic
  message is visible.
- *Odd permission errors*: don't run the dev tools in an Administrator shell.
- *Launch at startup in dev*: it registers the exe you're running (the dev build). Test it in the installed app.
- *Tests*: they need neither the artwork nor Rust, so `npm test` works on any machine with Node.

---

## Releasing

1. Confirm the art licence and record it in [`THIRD_PARTY.md`](THIRD_PARTY.md).
2. Bump `"version"` in `src-tauri/tauri.conf.json`. The installer name and Settings → About come from it.
3. Run `npm test` and `npx tsc --noEmit`; both must pass.
4. Quit the tray app and any dev server, then run `npm run tauri build`.
5. Run the [release checklist](#release-checklist), ideally on a second PC.
6. On GitHub: **Releases → Draft a new release**, create a tag such as `v0.9.0`, attach
   `src-tauri\target\release\bundle\nsis\Desktop Cat_<version>_x64-setup.exe` (and optionally `USER_GUIDE.md`), and
   publish. Mention in the notes that the installer is unsigned.

The installer lands in `src-tauri\target\release\bundle\nsis\`. Share that file, not the bare program from
`target\release`.

What is configured (`src-tauri/tauri.conf.json`): product name and version, publisher and descriptions, the cat app icon,
NSIS installer only, per-user install, the WebView2 bootstrapper embedded in the installer, and an uninstall hook
(`src-tauri/installer-hooks.nsi`) that removes the startup entry.

*Optional later:* a **code-signing certificate** removes the "unknown publisher" warning. It costs money, so it is only
worth it for wide distribution.

### Release checklist

Do this on a PC that has **not** been used for development if you can (a spare PC or a Windows virtual machine).

| # | Test | Expected |
|---|---|---|
| 1 | Run the installer | No administrator prompt; installs; "Run Desktop Cat" at the end starts the cat |
| 2 | First start | Cat appears, tray icon has the cat icon, collection empty |
| 3 | Start the app a second time (Start menu) | No second cat; the control panel of the first one opens |
| 4 | Settings → Launch at startup on; sign out and in (or restart) | Cat starts by itself |
| 5 | Windows Settings → Apps → Startup | "Desktop Cat" is listed while enabled, gone when disabled in the app |
| 6 | Find something, wear an item, change colour, quit, start again | Everything is remembered |
| 7 | Install the same installer again over the top | Works; progress kept |
| 8 | Check `%LOCALAPPDATA%\com.desktopcat.app` | `save.json` is there |
| 9 | Uninstall without ticking "Delete the application data" | App gone; startup entry gone; `save.json` kept |
| 10 | Reinstall | Collection is back |
| 11 | Uninstall with "Delete the application data" ticked | Folder gone |
| 12 | Windows 10 PC without WebView2 (if available) | Installer installs it; app starts |
| 13 | Work through the [Windows manual test checklist](#manual-test-checklist-windows) | All pass |
| 14 | Settings → About | Shows the right version number |

### Tidying the project

Two optional helper scripts live in `tools/`. Run them from the project folder (the one containing `src-tauri`), with the
dev server stopped:

```powershell
powershell -ExecutionPolicy Bypass -File tools\tidy.ps1              # removes unused template files
powershell -ExecutionPolicy Bypass -File tools\rename-internals.ps1  # renames the internal name "spike" to "desktop-cat"
```

`rename-internals.ps1` changes the package name, the Rust crate name and `main.rs` (backups go to `.rename-backup`).
Run it only when the app builds and runs. The first build afterwards recompiles for a few minutes. Renaming the
**folder** itself is always safe: close terminals and editors, then rename it in File Explorer.

---

## How it works

<details>
<summary><b>Windows and click-through</b></summary>

| Window | Purpose |
|---|---|
| `main` (overlay) | Transparent, borderless, always-on-top, hidden from the taskbar. A thin strip along the bottom of the primary monitor's work area (above the taskbar). The cat is drawn on a canvas inside it. Owns the simulation. |
| `control` | A normal window, created on demand and destroyed when closed, so it costs nothing while closed. |

**Click-through.** Windows can only make a whole window click-through or not. So the overlay starts click-through, and a
Rust thread reads the **pointer position only** and turns clicks on only while the pointer is over the cat or a dropped
gem. It polls about 8 times a second while the pointer is far from the strip, and 25 times a second only when it is
near. Hidden, paused or in click-through mode, it checks only every 250 ms.

**The watcher.** All of this runs on one background thread (`watcher.rs`) that is **supervised**: if it ever panics it is
restarted automatically, so click handling can't silently die.

**Display changes.** Every 2 seconds Rust compares the work area and display scaling, and moves the strip back where it
belongs if either changed. The page re-picks its pixel scale when the window resizes. The strip always uses the
**primary** monitor's work area, so it stays above a bottom taskbar and at the screen edge for a top, left or right one.

**Fullscreen apps.** Once a second Rust asks Windows (`SHQueryUserNotificationState`) whether a fullscreen app, Direct3D
game or presentation is in front. If so (and the setting is on), the cat is *auto-hidden*: invisible, click-through and
not running, like Hide, but without touching your own Hide setting.

**Taskbar awareness.** `native.rs` reads the taskbar edge and auto-hide state (`SHAppBarMessage`) and whether icons are
left-aligned (Windows 10 always; Windows 11 from the `TaskbarAl` registry value). Changes reach the page as
`platform-changed`, which moves the "ponder over the icons" spot.

**Crisp pixels.** The sprite scale is a whole number of *physical* pixels chosen from the display scaling (4× at 100%,
5× at 125%, 6× at 150%), with image smoothing off.

**Time.** The simulation advances in capped steps (500 ms max), so waking from sleep never causes a catch-up burst.

</details>

<details>
<summary><b>State ownership, events and commands</b></summary>

- **One simulation**, in the overlay page (`src/main.ts` + `src/simulation/catEngine.ts`). The control panel only sends
  requests and displays what the overlay publishes.
- **Rust** owns: native window work, the tray, the on/off flags (visible, paused, click-through, auto-hidden), the click
  areas, autostart, single-instance, and all save-file reads and writes.
- **TypeScript** owns: gameplay rules, behaviour selection, treasures, validation of saved data.

Events (the overlay validates anything it receives against fixed lists):

| Event | From → to | Meaning |
|---|---|---|
| `settings-changed` | Rust → all | visible / paused / click_through / auto_hidden / hide_in_fullscreen changed |
| `platform-changed` | Rust → overlay | taskbar edge, auto-hide or icon alignment changed |
| `cat-cursor` | Rust → overlay | pointer near the strip (position only) |
| `cat-before-quit` | Rust → overlay | flush the save, we're exiting |
| `cat-status` | overlay → control | mood, behaviour, traits |
| `cat-collection` | overlay → control | inventory, history, sets, cosmetics, pending gem |
| `cat-prefs` | overlay → control | saved preferences |
| `cat-activity` | overlay → control | recent activity list |
| `cat-status-request` | control → overlay | "send me everything" |
| `cat-action` | control → overlay | pet / play / inspect |
| `cat-pref` | control → overlay | change a preference |
| `cat-equip` | control → overlay | wear / remove a cosmetic |
| `cat-reset` | control → overlay | erase progress (must carry the word RESET) |

Rust commands: `get_settings`, `toggle_setting`, `set_hit_rects`, `apply_saved_settings`, `set_hide_in_fullscreen`,
`get_platform_info`, `quit_app`, `get_autostart`, `set_autostart`, `load_game`, `save_game`, `reset_game`,
`quarantine_save`.

Tauri plugins: `tauri-plugin-autostart`, `tauri-plugin-single-instance`. Permissions are least-privilege
(`core:default` only).

</details>

<details>
<summary><b>Personality (<code>catEngine.ts</code>)</b></summary>

- Behaviours: idle, walk, look, nap, play, celebrate, ponder, discover. Each has a base "what comes next" table that never
  lists itself, multiplied by trait weights and mood weights. Naps, plays and ponders have cooldowns.
- Moods are rolled from traits, time of day and recent interactions, and expire after a minute or two.
- Randomness and the clock are injected, so behaviour is unit-tested with seeded random numbers.
- *Calm* intensity: 30% slower, a quarter as many runs, no mid-walk changes of mind.
- Interactions nudge traits by one point, bounded to 0-100. Too many pets in 20 seconds make the cat grumpy for 40 seconds.

</details>

<details>
<summary><b>Treasures (<code>treasures.ts</code>, <code>treasureSystem.ts</code>, <code>drops.ts</code>)</b></summary>

- Finds happen at "opportunities" (the end of a walk, look, ponder or play) with a small chance, shaped by curiosity and
  mood, with a minimum gap between finds. Tuned to roughly one find every 7-8 minutes of running time; a full collection
  takes around 11 hours of running time on average.
- Rarity weights: common 70, uncommon 22, rare 7, legendary 1. The special item comes from a milestone (25 finds).
- A find first becomes a **pending drop** (saved, so it survives a restart). Clicking it, or 2 minutes passing, adds it to
  the inventory. Duplicates raise a count; cosmetics are never duplicated.
- Away rolls: one roll per 20 minutes away, 8 hours counted at most, at most 5 finds.

</details>

<details>
<summary><b>Saving (<code>saveData.ts</code>, <code>persistence.ts</code>, <code>persistence.rs</code>)</b></summary>

- A single versioned JSON file. The page serialises it; Rust writes it **atomically** (temp file → flush → keep the
  previous copy as `.bak` → rename). Writes are coalesced to at most one every 2 seconds, and never per frame.
- On load everything is **validated and repaired** (unknown items dropped, numbers clamped, collections and cosmetics
  re-derived), so one bad field never costs the collection.
- A file that can't be understood is **set aside** (never deleted) and a fresh save starts. A save from a *newer* app
  version is refused rather than damaged. If the file can't be read at all, saving is disabled so it isn't overwritten.
- Migrations are supported (`MIGRATIONS` in `saveData.ts`, empty until the format changes).

</details>

<details>
<summary><b>Cosmetics (<code>cosmetics.ts</code>, <code>anchors.ts</code>, <code>catPainter.ts</code>)</b></summary>

- `anchors.ts` holds the measured head and neck position for every frame (identical for all 50 colours).
- Each cosmetic is a list of pixels placed relative to those anchors. "Masked" pixels (the collar) only recolour the cat's
  own fur; the rest (bow, leaves, bell) may stick out.
- `CatPainter` draws the frame, then the accessories, on a small scratch canvas and copies it over, so nothing else on
  screen is affected. It is used by both the overlay and the Appearance preview.
- One item per spot (head or neck). Worn items are saved.

</details>

---

## Project structure

```
.
├── index.html                  overlay page (one transparent canvas)
├── control.html                control panel page (all four tabs and their styling)
├── vite.config.ts              two entry pages: index.html and control.html
├── public/cats/                the 50 colour sheets (generated by tools/prepare-art.py, not in git)
├── src/
│   ├── main.ts                 overlay: render loop, interactions, discoveries, events, saving
│   ├── control.ts              control panel: rendering, events, shortcuts
│   ├── render/catPainter.ts    draws a frame plus cosmetics
│   ├── services/
│   │   ├── persistence.ts      load/create/recover logic, write scheduler, Tauri bridge
│   │   └── sound.ts            tiny synthesized sound effects
│   └── simulation/             pure logic: no DOM, no Tauri, all unit-tested
│       ├── animation.ts        animation table, frame lookup, pixel scale
│       ├── catEngine.ts        behaviour, moods, traits, movement, interactions
│       ├── treasures.ts        catalogue, sets, rarity weights
│       ├── treasureSystem.ts   discovery odds, drops, away rolls
│       ├── drops.ts            where drops land, click area
│       ├── saveData.ts         save model, validation, migrations
│       ├── cosmetics.ts        cosmetic list, equip rules, accessory pixels
│       ├── anchors.ts          head/neck positions per frame
│       ├── catSheets.ts        list of the 50 colours
│       ├── platform.ts         taskbar info type and the ponder zone it implies
│       └── activity.ts         recent-activity list
├── src-tauri/
│   ├── tauri.conf.json         window, bundle, version and installer settings
│   ├── installer-hooks.nsi     installer extras (removes the startup entry on uninstall)
│   ├── icons/                  the app icon in every size Windows needs
│   ├── capabilities/           least-privilege permissions per window
│   └── src/
│       ├── lib.rs              overlay placement, tray, settings state, commands, plugins
│       ├── native.rs           Windows queries: work area, pointer, fullscreen, taskbar
│       ├── watcher.rs          supervised background thread: click-through, display changes, fullscreen
│       ├── persistence.rs      atomic save/load/reset/quarantine
│       └── main.rs             entry point
├── tools/
│   ├── prepare-art.py          builds public/cats from the artwork pack
│   ├── tidy.ps1                removes unused template files (optional)
│   └── rename-internals.ps1    renames the internal name "spike" to "desktop-cat" (optional)
├── tests/                      Vitest unit tests
├── .github/workflows/ci.yml    type-check + tests, and a Windows Rust build check
├── USER_GUIDE.md               one-page guide for the people you share it with
├── THIRD_PARTY.md              software and art credits and licences
└── README.md                   this file
```

---

## Art assets and licensing

> ⚠️ **The cat artwork is not covered by this project's licence and is not included in this repository.**

The sprites come from a third-party pack named `Cats Download.zip`. When it was inspected it contained **no licence
file**, so its terms (credit? commercial use? redistribution?) are **unknown**. Until you have checked them on the pack's
original page:

- do **not** commit `public/cats/` or the original zip. `.gitignore` already excludes `public/cats/` and `assets-source/`.
  If the licence allows redistribution, delete those two lines from `.gitignore`;
- remember that `src-tauri/icons/` and the cosmetics' placement data are derived from the sprite too;
- do not distribute built installers outside people you trust, because they contain the artwork.

Record the author, source link and licence in [`THIRD_PARTY.md`](THIRD_PARTY.md) once you know them.

What the pack contains (found by inspecting it):

- 50 base colour sheets, plus 14 marking overlays (not used yet).
- Each sheet is 1024×544 RGBA with a transparent background; only the left 768 px are used. The top 32 px are a text
  header, which is cropped away. Below it is a 32×32 frame grid, 24 columns × 16 rows.
- Six animation blocks of four columns: sitting down (6 frames), looking around (5), laying down (8), walking (4),
  running (5), running 2.0 (8). Frames 5+ continue on the next row.
- Eight facing directions, as pairs of rows. The app uses **left** (rows 4-5) and **right** (rows 12-13).
- All 50 sheets share exactly the same silhouettes and frame layout, so colours are interchangeable.
- No timing data comes with the pack, so frame durations were chosen by eye.

Everything else visual is original to this project: the collection icons are emoji from the viewer's own system font, and
the heart, question mark, sparkles, gem and accessories are small shapes drawn in code.

---

## Data, privacy and security

- Everything is stored locally. The app makes **no network requests** and has **no telemetry**. After installation it works
  fully offline.
- Save file: `%LOCALAPPDATA%\com.desktopcat.app\save.json` (plus `save.json.bak`, and set-aside files named `*.corrupt-*`
  or `*.unreadable-*` if something was ever unreadable).
- Saved: cat name and traits, inventory, find history (last 200), pending gem, unlocked and worn cosmetics, completed sets,
  preferences. Not saved: animation state, mood, window state.
- To reset: Settings → Start over (type RESET). Preferences are kept. Or delete the folder above while the app is closed.
- The cat only *reads* the pointer position; it never moves it, clicks, types, or listens to the keyboard globally.
  It does not touch your files.
- Tauri permissions are least-privilege: `core:default` only. No shell, filesystem or process access from the pages, no
  remote scripts or pages.
- **Reporting a security problem:** please use GitHub's private "Report a vulnerability" option on the repository's
  Security tab rather than a public issue.

---

## Testing

`npm test` runs the Vitest suite (**122 tests** in 8 files), and `npx tsc --noEmit` type-checks the TypeScript. Neither
needs the artwork or Rust. They cover: sprite maths, behaviour selection and weights, traits and moods, time of day,
cooldowns, movement bounds, catch-up caps, interactions, cursor curiosity, treasure odds and rarity distribution,
milestones, drops, away rolls, set completion, save validation, repair and migrations, the write scheduler and
load/recover flow, sound, the activity list, animation intensity, colour list safety, cosmetics, head and neck positions
for every frame, the taskbar-aware ponder zone, and the fullscreen preference.

**Continuous integration** (`.github/workflows/ci.yml`) runs on every push and pull request: the type-check and unit
tests on Linux, and `cargo check` of the Rust code on Windows (the native code is Windows-specific, so it has to be
checked there).

**Not covered by automated tests (checked by hand on Windows):** transparency, click-through behaviour, the tray, the
taskbar position, display scaling and resolution changes, sleep and resume, autostart, the installer, and how the control
panel looks. The Rust code has no unit tests yet.

### Manual test checklist (Windows)

Run through this after installing a new build. "Within a few seconds" means up to about 2 s, since the watcher checks
display and taskbar changes every 2 s and fullscreen every 1 s.

| # | Test | Expected |
|---|---|---|
| 1 | Start the app | Cat appears above the taskbar; background fully transparent; tray icon present |
| 2 | Click and type in windows behind the strip, including right next to the cat | Everything works normally; only the cat itself takes clicks |
| 3 | Click the cat | Heart appears; Recent activity updates |
| 4 | Play a video fullscreen (browser F11 or the player's fullscreen button) | Cat disappears within a few seconds; returns when you leave fullscreen |
| 5 | Settings → turn off "Hide during fullscreen apps", repeat 4 | Cat stays visible over the video |
| 6 | Windows 11: Settings → Personalization → Taskbar → Taskbar behaviours → alignment Left, then Centre | At its next ponder the cat goes to the matching area (left or middle) |
| 7 | Turn on taskbar auto-hide | Cat stands at the very bottom of the screen; the taskbar slides over it (known) |
| 8 | Change display scaling 100% → 125% → 150% and back | Cat stays on screen above the taskbar within a few seconds and stays sharp |
| 9 | Change screen resolution | Cat repositions and stays within the screen |
| 10 | Sleep the PC, wake it, wait a minute | Cat carries on normally, no jump or burst of activity; strip in the right place |
| 11 | Lock the screen (Win+L) and sign back in | Cat carries on |
| 12 | Switch on click-through mode, then recover it from the tray and from the control panel | Cat ignores clicks, then reacts again |
| 13 | Hide, pause, resume from tray and control panel | States match in both places |
| 14 | Close the control panel | Cat keeps running |
| 15 | Exit from the tray, restart | Collection, colour, worn items and settings are all still there |
| 16 | Task Manager → Details: watch `Desktop Cat` and its `msedgewebview2` processes for a few minutes, while the cat sits and while it walks | Note CPU % and memory for each |
| 17 | (If you have a second monitor) Plug and unplug it, or change which one is primary | Cat stays on the primary monitor, on screen |

---

## Known limitations

- **Primary monitor only.** The cat never wanders onto other monitors.
- The ponder spot is an *estimate* of where the taskbar icons are (the middle for centred icons, the left for left-aligned
  ones; `platform.ts`). Real icon positions would need Windows UI Automation.
- With the taskbar set to auto-hide, the cat stands at the very bottom of the screen and the taskbar slides over it.
- Fullscreen detection relies on Windows' own report; a few apps that fake fullscreen with a borderless window may not be
  detected.
- There is no stand-up animation after lying down, so the cat just switches to sitting.
- The discovery chime may stay silent until you've clicked the cat once (webviews block sound before interaction).
- The cat's name is fixed ("Mochi").
- The installer is unsigned (SmartScreen warning).
- The version stays 0.9.0 until the release checklist has been completed on a clean PC.
- The art pack's licence is unconfirmed (see above).
- The Rust code has no unit tests yet; it is checked by compiling it on Windows (including in CI) and by hand.

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation, asset inspection, Tauri + TypeScript + Vite setup | ✅ done |
| 1 | Transparent overlay, tray, click-through, control window, first animation, display changes | ✅ done |
| 2 | All six animations and weighted wandering | ✅ done |
| 3 | Moods, traits, interactions, time of day, cursor curiosity | ✅ done |
| 3+ | Pondering over the taskbar icons | ✅ done |
| 4A | Treasures, discovery, away finds, saving, collection, reset | ✅ done |
| 4B | Physical drops you click to collect | ✅ done |
| 5 | Control panel pages, colours, sound, shortcuts, startup setting, activity | ✅ done |
| 5B | Wearable cosmetics | ✅ built, needs wider testing |
| 6A | Robustness: fullscreen apps, taskbar awareness, supervised watcher, lighter polling, test checklist | ✅ built, needs wider testing |
| 6B | Release: icon, installer settings, one-copy-at-a-time, uninstall hook, About, scripts, user guide | ✅ built, needs wider testing |
| 6C | Confirm the art licence; run the release checklist on a clean PC; set version 1.0.0 | ⏳ next |
| 7 | Ideas (not required): naming the cat, quiet hours, save export/import, dragging, themed sets, multi-monitor, real icon positions | 💡 |

---

## Changelog

Newest first.

**GitHub preparation**
- This README rewritten for GitHub: install, build from source, releasing, architecture, testing, privacy, contributing.
- `tools/prepare-art.py` builds the colour sheets from the artwork pack; the artwork is kept out of git by `.gitignore`.
- Added `.github/workflows/ci.yml` (type-check, unit tests, Windows `cargo check`).

**Phase 6B: Release preparation (version 0.9.0)**
- New app icon (the cat, with ribbon and collar) in every size; the tray icon uses it too.
- Installer: per-user, no administrator rights, WebView2 bootstrapper embedded, NSIS only, product name, publisher and
  descriptions set; `npm run tauri build` builds just the installer.
- Uninstalling removes the "launch at startup" entry.
- Only one copy of the app runs at a time (`tauri-plugin-single-instance`); starting it again opens the control panel.
- Settings has an About section with the version and the data location.
- Added `USER_GUIDE.md`, `THIRD_PARTY.md`, the release checklist and the optional `tools/` scripts.

**Phase 6A: Robustness**
- Hides while a fullscreen app, game or presentation is in front (setting, on by default).
- Reads the taskbar (edge, auto-hide, icon alignment) and ponders where the icons really are.
- The watcher lives in `watcher.rs` on a supervised thread that restarts itself after a crash; Windows queries moved to
  `native.rs`.
- Pointer polling drops to about 8 times a second while the pointer is far from the strip.
- Added the Windows manual test checklist.

**Phase 5B: Wearable cosmetics**
- Red Ribbon, Leaf Crown and Bell Collar, drawn on every frame of every animation, both directions, any colour.
- Measured head and neck positions for all 70 frames (`anchors.ts`).
- Appearance page: live preview and Wear/Remove buttons. Worn items are saved.

**Phase 5: Control panel and polish**
- Control panel rebuilt as four pages with transitions, empty and error states, keyboard shortcuts and toasts.
- 50 fur colours, sound effects, Calm/Normal intensity, launch at startup.
- Item reveal label on pickup, recent activity feed.

**Phase 4B: Physical drops**
- Finds are left on the ground as a twinkling gem; click to collect, or they collect after 2 minutes. Saved across restarts.

**Phase 4A: Treasures and saving**
- 16 treasures, rarity weights, 3 sets with cosmetic rewards, discovery pacing, away finds.
- Versioned, validated, atomically written save file; Start over with typed confirmation.

**Pondering**
- New behaviour: walk to the icon area, sit, thinking "?" above the head.

**Phase 3: Personality**
- Moods, five traits, time of day, cursor curiosity, pet/play/inspect, heart effect.

**Phase 2: Behaviour**
- All six animations, weighted wandering, no repeats.

**Phase 1: Overlay**
- Transparent strip overlay with pointer-position click-through, tray menu, on-demand control window, display-change
  handling, first walking cat.

**Phase 0: Foundation**
- Asset inspection, Tauri 2 + TypeScript + Vite project.

---

## Contributing

Contributions and bug reports are welcome.

**Reporting a bug.** Please include: your Windows version and build, your display scaling and whether you use more than
one monitor, whether your taskbar icons are centred or left-aligned, the app version (Settings → About), what you did,
what you expected, and what happened. A screenshot helps. If the app crashed, include any text from a terminal if you were
running `npm run tauri dev`.

**Setting up.** Follow [Build from source](#build-from-source). Day to day:

```powershell
npm test                      # unit tests
npx tsc --noEmit              # type-check
cargo check --manifest-path src-tauri/Cargo.toml   # Rust compiles
npm run tauri dev             # run it
```

**Guidelines**
- Keep game logic in `src/simulation/` as pure functions (no DOM, no Tauri), with randomness and time injected, and add a
  unit test with it. Anything that touches Windows goes in `src-tauri/src/native.rs` or `watcher.rs`.
- The cat must never move the mouse, simulate clicks, type, capture keystrokes globally, or touch the user's files. Keep
  the Tauri permissions minimal, and don't add network access or telemetry.
- Keep the project compiling. Run the tests, the type-check and `cargo check` before opening a pull request.
- Don't write saves per frame; use the write scheduler. Anything added to the save needs validation in `saveData.ts` and a
  test, and older saves must still load.
- **Don't commit the artwork** (see [Art assets and licensing](#art-assets-and-licensing)).
- Update this README for any user-visible change: the relevant section, the roadmap, the changelog, the test count and the
  known limitations.

---

## License and credits

**Code:** no licence has been chosen yet. Until one is added, all rights are reserved by the author. To make the code open
source, add a `LICENSE` file (MIT or Apache-2.0 are common choices) and update this section. **A code licence does not
cover the artwork.**

**Artwork:** the cat sprites are from a third-party pack. Author, source and licence are to be recorded in
[`THIRD_PARTY.md`](THIRD_PARTY.md) once confirmed.

**Built with:** [Tauri](https://tauri.app), TypeScript, [Vite](https://vitejs.dev) and [Vitest](https://vitest.dev); the Rust
crates `serde`, `serde_json` and `windows-sys`; and the Tauri plugins `autostart` and `single-instance`. Full list and
licences in [`THIRD_PARTY.md`](THIRD_PARTY.md).

---

## Maintaining this README

This file is updated whenever the project changes. For each change update: **Status**, the affected sections, the
**Roadmap** row, the **Changelog** (newest first), the test count, and **Known limitations** (add new ones, remove fixed
ones).
