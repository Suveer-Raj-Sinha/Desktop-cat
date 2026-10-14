# Desktop Cat 🐈

A small, cozy, slightly mischievous pixel-art cat that lives on your Windows desktop. It wanders along the top of the
taskbar, sits, naps, runs, ponders, finds little treasures, and remembers everything between sessions. It never needs
feeding and never nags.

> **Status:** Phases 0-6A are built (6A and 5B are awaiting testing on your PC). Phase 6B (release packaging) is next.
> See [Roadmap](#roadmap) and [Changelog](#changelog). This README is updated with every change to the project.

> **Note on the folder name:** the project currently lives in a folder called `spike` (it started as a throwaway
> experiment). It is the real project. Renaming it is planned for Phase 6B.

---

## Contents

1. [What it does](#what-it-does)
2. [Using the app](#using-the-app)
3. [Setting up a development machine](#setting-up-a-development-machine)
4. [Commands](#commands)
5. [How it works](#how-it-works)
6. [Project structure](#project-structure)
7. [Art assets](#art-assets)
8. [Saved data and privacy](#saved-data-and-privacy)
9. [Testing](#testing)
10. [Known limitations](#known-limitations)
11. [Roadmap](#roadmap)
12. [Changelog](#changelog)
13. [Maintaining this README](#maintaining-this-readme)

---

## What it does

**The cat**
- Lives in a thin, fully transparent strip along the bottom of your screen, standing on the taskbar edge.
- Uses all six animations from the art pack: sitting down, looking around, lying down, walking, running, running 2.0.
- Chooses what to do by weighted odds (never the same action twice in a row), shaped by **moods** (happy, curious,
  sleepy, playful, grumpy) and five **traits** (curiosity, playfulness, affection, laziness, mischief).
- Steps aside (hides and stops) while a **fullscreen app** such as a video, game or presentation is in front, and comes
  back when it ends. Can be switched off in Settings.
- Knows whether your taskbar icons are centred or left-aligned and ponders in the right area.
- Gets sleepier late at night (your PC clock) and turns to look at your mouse pointer when it comes near. Curious
  cats sometimes wander over to watch it.
- **Ponders**: walks to where the taskbar icons are (the middle of the screen, or the left if your icons are
  left-aligned), sits, and a thinking "?" bobs over its head.
- Reacts to being **petted** (click it: a heart floats up), to **play** (a run) and **inspect** (go investigate).
  Too much fuss makes it grumpy for a bit, and it just ignores you. It never punishes you for ignoring it.

**Treasures**
- 16 collectable treasures: 8 common, 4 uncommon, 2 rare, 1 legendary, 1 special (a milestone reward).
- After walks, looks, pondering and play, the cat has a small chance to find something. It sparkles and leaves a
  shiny gem on the ground. Click the gem to see what it was. Unclaimed finds are added automatically after 2 minutes.
- **While you were away**: finds are rolled for time the app was closed or the PC slept (capped at 8 hours and 5 finds).
- Three **sets** (Desk Drawer, Shiny Things, Nature Finds). Completing one unlocks a cosmetic.

**Customisation**
- 50 fur colours from the art pack.
- Three wearable cosmetics, shown on every animation frame, facing both ways: **Red Ribbon** (head), **Leaf Crown**
  (head), **Bell Collar** (neck). One item per spot.
- Settings: show/hide, pause, click-through mode, hide during fullscreen apps, sound effects, animation intensity
  (Calm / Normal), launch at startup.

**Everything is local.** No accounts, no network, no telemetry. See [Saved data and privacy](#saved-data-and-privacy).

---

## Using the app

- The cat appears automatically. Most of the strip is invisible and **clicks pass straight through** to the windows
  behind it. Only the cat itself (and a dropped gem) takes clicks.
- **Tray icon** (bottom right, possibly under the ^ arrow), right-click for:
  Open control panel · Hide/Show cat · Pause/Resume · Switch to click-through/interactive mode · Exit Desktop Cat.
  Closing the control panel never stops the cat. Only **Exit** (or the Quit button in Settings) does.
- **Click-through mode** makes the cat ignore clicks entirely. You can always switch it back from the tray or the
  control panel. (While it is on you can't pick up gems by hand, but they still collect themselves after 2 minutes.)
- **Control panel** (tray, then Open control panel), with four pages:
  - **Home**: mood, what the cat is doing, personality bars, Pet / Play / Inspect, recent activity.
  - **Collection**: progress, treasure grid, set progress, recent finds.
  - **Appearance**: live preview, fur colour, wear/remove cosmetics.
  - **Settings**: toggles, shortcuts, start over (type RESET), quit.
- **Keyboard shortcuts** (control panel focused): `1`-`4` pages · `P` pet · `L` play · `I` inspect · `H` hide/show.
  Nothing listens to the keyboard globally.
- The cat never moves your mouse, clicks or types in other apps, or touches your files.

---

## Setting up a development machine

Windows 10/11 (Windows 11 is the main target). Install, from PowerShell:

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

WebView2 is already part of Windows 11 (Windows 10 may need the Evergreen runtime). Use a **normal, non-admin**
PowerShell for day-to-day work.

First-time setup of the project:

```powershell
cd <project folder>
npm install
```

The Rust dependencies download and compile on the first run, which takes several minutes. Later runs are fast.

---

## Commands

Run from the project folder (currently `spike`):

| What | Command |
|---|---|
| Install JS dependencies | `npm install` |
| Run the app in development | `npm run tauri dev` |
| Run the unit tests | `npm test` |
| Type-check the TypeScript | `npx tsc --noEmit` |
| Build the Windows installer | `npm run tauri build -- --bundles nsis` |

The installer is written to `src-tauri\target\release\bundle\nsis\Desktop Cat_<version>_x64-setup.exe`. Send that
file (not `spike.exe`) to other people. It is not code-signed, so Windows shows an "unknown publisher" screen
(More info → Run anyway).

Stop the dev app with Ctrl+C. Quit the tray app before rebuilding.

**Troubleshooting**
- *`unresolved import tauri_plugin_autostart`*: the Rust dependency is missing. Run
  `cd src-tauri; cargo add tauri-plugin-autostart@2; cd ..`.
- *`unresolved import` / unknown `windows_sys` items after updating*: the `windows-sys` line in
  `src-tauri\Cargo.toml` needs these features:
  `windows-sys = { version = "0.59", features = ["Win32_Foundation", "Win32_UI_WindowsAndMessaging", "Win32_UI_Shell", "Win32_System_Registry"] }`
  (under `[target.'cfg(windows)'.dependencies]`).
- *Odd permission errors*: don't run the dev tools in an Administrator shell.
- *Cat doesn't appear*: check the tray, and run in a terminal so any Rust panic message is visible.
- *"Launch at startup" in dev*: it registers the exe you're running (the dev build). Test it in the installed app.

---

## How it works

### Windows

| Window | Purpose |
|---|---|
| `main` (overlay) | Transparent, borderless, always-on-top, hidden from the taskbar. Sized to a thin strip along the bottom of the work area (above the taskbar). The cat is drawn on a canvas inside it. Owns the simulation. |
| `control` | A normal window, created on demand and destroyed when closed, so it costs nothing while closed. |

**Click-through:** Windows can only make a whole window click-through or not. So the overlay starts click-through, and a
Rust thread reads the **pointer position only** (about 25 times a second) and turns clicks on only while the pointer is
over the cat or a dropped gem. Hidden or in click-through mode, it naps and checks only every 250 ms.

**Display changes:** every 2 seconds Rust compares the work area and display scaling, and moves the strip back on
screen if either changed. The page re-picks its pixel scale when the window resizes. The strip always uses the
**primary** monitor's work area, so it stays above a bottom taskbar and at the screen edge for a top, left or right one.

**The watcher:** all of this runs on one background thread (`watcher.rs`) that is **supervised**: if it ever panics it
is restarted automatically, so click handling can't silently die. Pointer polling is relaxed (about 8 times a second)
while the pointer is far from the strip and fast (25 times a second) only when it is near.

**Fullscreen apps:** once a second Rust asks Windows (`SHQueryUserNotificationState`) whether a fullscreen app,
Direct3D game or presentation is in front. If so (and the setting is on) the cat is *auto-hidden*: invisible,
click-through and not running, like Hide, but without touching your own Hide setting.

**Taskbar awareness:** `native.rs` reads the taskbar edge and auto-hide state (`SHAppBarMessage`) and whether icons
are left-aligned (Windows 10 always; Windows 11 from the `TaskbarAl` registry value). Changes are announced to the page
as `platform-changed`, which moves the ponder spot.

**Crisp pixels:** the sprite scale is a whole number of *physical* pixels chosen from the display scaling (4x at 100%,
5x at 125%, 6x at 150%), with image smoothing off.

### State ownership

- **One simulation**, in the overlay page (`src/main.ts` + `src/simulation/catEngine.ts`). The control panel only
  sends requests and displays what the overlay publishes.
- **Rust** owns: native window work, the tray, the on/off flags (visible / paused / click-through), the click areas,
  autostart, and all save-file reads and writes.
- **TypeScript** owns: gameplay rules, behaviour selection, treasures, validation of saved data.

### Events and commands

Events between windows (the overlay validates anything it receives against fixed lists):

| Event | From → to | Meaning |
|---|---|---|
| `settings-changed` | Rust → all | visible / paused / click_through / auto_hidden / hide_in_fullscreen changed |
| `cat-cursor` | Rust → overlay | pointer near the strip (position only) |
| `platform-changed` | Rust → overlay | taskbar edge, auto-hide or icon alignment changed |
| `cat-before-quit` | Rust → overlay | flush the save, we're exiting |
| `cat-status` | overlay → control | mood, behaviour, traits |
| `cat-collection` | overlay → control | inventory, history, sets, cosmetics, pending gem |
| `cat-prefs` | overlay → control | saved preferences (sound, intensity, colour) |
| `cat-activity` | overlay → control | recent activity list |
| `cat-status-request` | control → overlay | "send me everything" |
| `cat-action` | control → overlay | pet / play / inspect |
| `cat-pref` | control → overlay | change a preference |
| `cat-equip` | control → overlay | wear / remove a cosmetic |
| `cat-reset` | control → overlay | erase progress (must carry the word RESET) |

Rust commands: `get_settings`, `toggle_setting`, `set_hit_rects`, `apply_saved_settings`, `quit_app`,
`set_hide_in_fullscreen`, `get_platform_info`, `get_autostart`, `set_autostart`, `load_game`, `save_game`, `reset_game`, `quarantine_save`.

### Personality (`catEngine.ts`)

- Behaviours: idle, walk, look, nap, play, celebrate, ponder, discover. Each has a base "what comes next" table that
  never lists itself, multiplied by trait weights and mood weights. Naps, plays and ponders have cooldowns.
- Time is advanced in capped steps (500 ms max), so waking from sleep never causes a catch-up burst.
- Randomness and the clock are injected, so behaviour is unit-tested with seeded random numbers.
- *Calm* intensity: 30% slower, a quarter as many runs, no mid-walk changes of mind.

### Treasures (`treasures.ts`, `treasureSystem.ts`, `drops.ts`)

- Finds happen at "opportunities" (the end of a walk, look, ponder or play) with a small chance, shaped by curiosity
  and mood, and a minimum gap between finds. Tuned to roughly one find every 7-8 minutes of running time.
- Rarity weights: common 70, uncommon 22, rare 7, legendary 1. The special item comes from a milestone (25 finds).
- A find first becomes a **pending drop** (saved, so it survives a restart). Clicking it, or 2 minutes passing, adds it
  to the inventory. Duplicates raise a count; cosmetics are never duplicated.

### Saving (`saveData.ts`, `persistence.ts`, `persistence.rs`)

- A single versioned JSON file. The page serialises it; Rust writes it **atomically** (temp file → flush → keep the
  previous copy as `.bak` → rename). Writes are coalesced to at most one every 2 seconds, and never per frame.
- On load everything is **validated and repaired** (unknown items dropped, numbers clamped, collections and cosmetics
  re-derived), so one bad field never costs the collection.
- A file that can't be understood is **set aside** (never deleted) and a fresh save starts. A save from a *newer*
  app version is refused rather than damaged. If the file can't be read at all, saving is disabled so it isn't
  overwritten.
- Migrations are supported (`MIGRATIONS` in `saveData.ts`, empty until the format changes).

### Cosmetics (`cosmetics.ts`, `anchors.ts`, `catPainter.ts`)

- `anchors.ts` holds the measured head and neck position for every frame (identical for all 50 colours).
- Each cosmetic is a list of pixels placed relative to those anchors. "Masked" pixels (the collar) only recolour the
  cat's own fur; the rest (bow, leaves, bell) may stick out.
- `CatPainter` draws the frame, then the accessories, on a small scratch canvas and copies it over, so nothing else on
  screen is affected. Used by both the overlay and the Appearance preview.

---

## Project structure

```
spike/                          (the project; to be renamed)
├── index.html                  overlay page (one transparent canvas)
├── control.html                control panel page (all four tabs and their styling)
├── vite.config.ts              two entry pages: index.html and control.html
├── public/cats/                the 50 colour sheets (cropped, 768x512 each)
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
│   ├── tauri.conf.json         window, bundle and app settings
│   ├── capabilities/           least-privilege permissions per window
│   └── src/
│       ├── lib.rs              overlay placement, tray, settings state, commands, autostart
│       ├── native.rs           Windows queries: work area, pointer, fullscreen, taskbar
│       ├── watcher.rs          supervised background thread: click-through, display changes, fullscreen
│       ├── persistence.rs      atomic save/load/reset/quarantine
│       └── main.rs             entry point (generated)
└── tests/                      Vitest unit tests
```

---

## Art assets

The cat artwork is from the supplied pack `Cats Download.zip` (the original zip is kept untouched outside the
project). Findings from inspecting it:

- 50 base colour sheets, plus 14 marking overlays (not used yet).
- Each sheet is 1024x544 RGBA with a transparent background; only the left 768 px are used. The top 32 px are a text
  header, which is cropped away. Below it is a 32x32 frame grid, 24 columns x 16 rows.
- Six animation blocks of four columns: sitting down (6 frames), looking around (5), laying down (8), walking (4),
  running (5), running 2.0 (8). Frames 5+ continue on the next row.
- Eight facing directions, as pairs of rows. The app uses **left** (rows 4-5) and **right** (rows 12-13).
- All 50 sheets share exactly the same silhouettes and frame layout, so colours are interchangeable.
- No timing data comes with the pack, so frame durations were chosen by eye.

> ⚠️ **The zip contained no license file.** Check the original download page for its terms before distributing the
> app to anyone, and add the credit/licence text here.

The collection icons are emoji. The question mark, hearts, sparkles and gem are tiny shapes drawn in code.

---

## Saved data and privacy

- Everything is stored locally. The app makes no network requests and has no telemetry.
- Save file: `%LOCALAPPDATA%\com.desktopcat.app\save.json` (plus `save.json.bak`, and set-aside files named
  `*.corrupt-*` or `*.unreadable-*` if something was ever unreadable).
- Saved: cat name and traits, inventory, find history (last 200), pending gem, unlocked and worn cosmetics, completed
  sets, preferences. Not saved: animation state, mood, window state.
- To reset: Settings → Start over (type RESET). Preferences are kept. Or delete the folder above while the app is closed.
- Tauri permissions are least-privilege (`core:default` only). No shell, filesystem or process access from the pages.
  The cat only *reads* the pointer position; it never moves it, clicks, or listens to the keyboard globally.

---

## Testing

`npm test` runs the Vitest suite (**122 tests**, plus a TypeScript type-check with `npx tsc --noEmit`). It covers:
sprite maths, behaviour selection and weights, traits and moods, time-of-day, cooldowns, movement bounds, catch-up
caps, interactions, cursor curiosity, treasure odds and rarity distribution, milestones, drops, away rolls, set
completion, save validation, repair and migrations, the write scheduler and load/recover flow, sound, the activity
list, animation intensity, colour list safety, cosmetics, head/neck positions for every frame, the taskbar-aware ponder
zone, and the fullscreen preference.

### Manual test checklist (Windows)

Run through this after installing a new build and note anything that differs. "Within a few seconds" means up to
about 2 s, since the watcher checks display and taskbar changes every 2 s and fullscreen every 1 s.

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
| 16 | Task Manager → Details: watch `Desktop Cat` and its `msedgewebview2` processes for a few minutes, while the cat sits and while it walks | Note CPU % and memory for each (report these numbers) |
| 17 | (If you have a second monitor) Plug and unplug it, or change which one is primary | Cat stays on the primary monitor, on screen |

**Not covered by automated tests (checked by hand on Windows):** transparency, click-through behaviour, the tray,
the taskbar position, display scaling and resolution changes, sleep/resume, autostart, the installer, and how the
control panel looks. The Rust code has no automated tests yet.

---

## Known limitations

- **Primary monitor only.** The cat never wanders onto other monitors.
- The ponder spot is an *estimate* of where the taskbar icons are (the middle for centred icons, the left for
  left-aligned ones; `PERCH_LO` / `PERCH_HI` and `platform.ts`). Real icon positions would need Windows UI Automation.
- With the taskbar set to auto-hide, the cat stands at the very bottom of the screen and the taskbar slides over it.
- Fullscreen detection relies on Windows' own report; a few apps that fake fullscreen with a borderless window may not
  be detected.
- There is no stand-up animation after lying down, so the cat just switches to sitting.
- The discovery chime may stay silent until you've clicked the cat once (webviews block sound before interaction).
- The cat's name is fixed ("Mochi").
- The installer is unsigned (SmartScreen warning). Launch-at-startup needs testing in the installed build.
- The art pack's licence is unconfirmed.
- Rust code is written and checked by compiling and running on a Windows machine, not by automated tests.

---

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Foundation, asset inspection, Tauri + React/TS/Vite setup | ✅ done |
| 1 | Transparent overlay, tray, click-through, control window, first animation, display changes | ✅ done |
| 2 | All six animations and weighted wandering | ✅ done |
| 3 | Moods, traits, interactions, time of day, cursor curiosity | ✅ done |
| 3+ | Pondering over the taskbar icons | ✅ done |
| 4A | Treasures, discovery, away finds, saving, collection, reset | ✅ done |
| 4B | Physical drops you click to collect | ✅ done |
| 5 | Control panel pages, colours, sound, shortcuts, startup setting, activity | ✅ done |
| 5B | Wearable cosmetics | ✅ built, awaiting your testing |
| 6A | Robustness: fullscreen apps, taskbar awareness, supervised watcher, lighter polling, test checklist | ✅ built, awaiting your testing |
| 6B | Release: rename project, app icon, installer polish, clean install/uninstall tests, final docs, licence check | ⏳ next |
| 7 | Ideas (not required): naming, quiet hours, save export/import, dragging, themed sets, multi-monitor, real icon positions | 💡 |

---

## Changelog

Newest first.

**Phase 6A: Robustness**
- Hides while a fullscreen app, game or presentation is in front (setting, on by default).
- Reads the taskbar (edge, auto-hide, icon alignment) and ponders where the icons really are.
- The watcher now lives in `watcher.rs` on a supervised thread that restarts itself after a crash; Windows queries moved
  to `native.rs`.
- Pointer polling drops to about 8 times a second while the pointer is far from the strip.
- New `platform-changed` event and `set_hide_in_fullscreen` / `get_platform_info` commands; `windows-sys` now needs the
  `Win32_UI_Shell` and `Win32_System_Registry` features.
- Added the Windows manual test checklist.
- Tests: 113 → 122.

**Phase 5B: Wearable cosmetics**
- Added Red Ribbon, Leaf Crown and Bell Collar, drawn on every frame of every animation, both directions, any colour.
- Measured head and neck positions for all 70 frames (`anchors.ts`).
- Appearance page: live preview and Wear/Remove buttons. The worn items are saved.
- New `CatPainter`; save field `equippedCosmetics` (older saves load fine).
- Tests: 98 → 113.
- Added this README.

**Phase 5: Control panel and polish**
- Control panel rebuilt as four pages (Home, Collection, Appearance, Settings) with transitions, empty and error
  states, keyboard shortcuts and toasts.
- 50 fur colours, sound effects, Calm/Normal intensity, launch at startup (`tauri-plugin-autostart`).
- Item reveal label on pickup, recent activity feed.

**Phase 4B: Physical drops**
- Finds are left on the ground as a twinkling gem; click to collect, or they collect after 2 minutes. Saved across restarts.
- Click areas for the cat and the gem (`set_hit_rects`).

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
- Asset inspection and manifest, Tauri 2 + React + TypeScript + Vite project.

---

## Maintaining this README

This file is updated whenever the project changes. For each change: update **Status**, the affected sections above,
the **Roadmap** row, the **Changelog** (newest first), the test count, and **Known limitations** (add new ones, remove
fixed ones).
