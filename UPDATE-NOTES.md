Tinkle Settings update

Deploy every file in redirect, including theme-assets, settings-data.js, settings-import.js, and settings-import.css. Hard-refresh afterward.

Settings > Appearance now offers the 22 visible themes from the uploaded truffled.lol reference. Their palettes, available background images, and supplied cursors have been adapted to Tinkle. Default keeps Tinkle Terrors and its Halloween scenery. Selecting another theme hides that scenery and uses the selected theme. Theme selection is remembered on this device and applied across pages. The source's hidden Leo theme is excluded, matching its normal theme menu.

Design has been removed. Existing Panic Button settings remain.

Settings > Tab cloak contains the reference's 28 presets and custom title/icon inputs. Choose a preset then Apply cloak, or enter a custom title and HTTP(S) icon URL. Reset cloak restores the original title and favicon. Choices persist across site pages and refreshes. Included favicon files are local; presets whose icons were absent from the uploaded archive retain their original icon URLs. A failed custom/preset icon falls back to the page's original icon.

Existing features retained: guest game browsing; required sign-in for Rewards/Shop/Account; New, Popular, and All Games sections; last 10 catalog entries tagged NEW; global weekly top 10 tagged with a small fire in every section. The fire hides on hover/focus while the play count appears. Floating hover titles, favorites, and existing admin tools remain.

Validation: inline and new external JavaScript passed syntax checks. Theme/preset counts, copied asset paths, removal of Design, and presence of cloak controls checked. Browser visual preview and live Firebase behavior remain unverified.

Settings layout refinement: Tab Cloak, Themes, and Panic Button are three equal cards in one desktop row, stacking on small screens. Cloak presets now apply as soon as selected, with a reset button; custom title/icon fields have been removed. The Tinkle Terrors heading uses the selected theme text/accent colors.

Home layout update: Customize home now controls Recently played, New games, Popular games, and All games with visibility, order, and working density settings. The new default order starts with Recently played. Layout preferences use a new version so outdated two-section settings do not reorder the new sections unexpectedly. Recently played updates after copying a game and uses the same grid and heading style as the other sections. Panic panels are transparent and the current-key badge uses theme colors.

Recent row refinement: Recently played uses compact 152×142 cards in a horizontal row with a visible scrollbar, mouse-wheel scrolling and left/right controls. Wheel gestures return to normal page scrolling at row boundaries. Panic section and preview borders/outlines removed. All four section headings stay orange across themes.

Floating settings update: recent-history cards hide NEW/Popular badges and play counts. Updates button uses the active palette. Settings has Tab cloak, Themes, and Anti-close in its top row; Panic spans the full row below. Settings panels have translucent backgrounds and no outer border or Control Room label. Anti-close uses the browser confirmation after user interaction; browsers control whether they display it. Panic navigation bypasses that confirmation.
Enter Code page update: themed input/buttons/panel, Back to games, Enter-to-submit, saved panic key, and live announcements/events/admin effects. Old trigger records establish a baseline and are not replayed. Audio remains subject to browser autoplay rules. Panic key works in the launcher and accessible same-origin game frames; browsers do not deliver cross-origin iframe key presses to the launcher. Recently played now starts flush left.
