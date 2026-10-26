# Inventra Desktop: UI Redesign Plan

Status: proposal for review. Nothing in this document has been built yet.
Scope: the native desktop app (`apps/desktop-native`, Avalonia 11.2.5, .NET 9, compiled bindings, MVVM).

## 1. Who this is for, and what that changes

The people at the counter are pharmacy staff and owners with little technical background. They are busy,
often standing, often interrupted by a customer, and afraid of breaking something. The redesign is judged by
three questions, not by how it looks in a screenshot:

1. Can a new person bill a customer without being shown how?
2. Can they always tell, in plain words, whether the app is working and whether their work is safe?
3. When something goes wrong, do they know what to do next without calling someone?

Everything below serves those three questions. "Modern, unique, glass" is the visual layer on top.

## 2. What is wrong today (found by running the app)

| # | Problem | Where | Cause |
|---|---|---|---|
| 1 | Text collides with buttons | Inventory sub-tab bar: the notification sentence runs under "+ Add Medicine" | Notification sits in a `Grid` column between two `Auto` columns with no trimming or wrapping |
| 2 | Labels overlap a badge | Top toolbar: "Module: Inventory..." runs into the "Cloud Connected" pill | Fixed-width pieces in a row that does not shrink or wrap |
| 3 | Bottom of the POS right panel is crushed | "Change Due" is cut by the "Complete & Print Bill" button | Fixed heights, no scroll region, no pinned footer |
| 4 | Table headers cut off ("Qt", "GS", "Taxabl") | POS and Inventory grids | Fixed column widths, no minimum widths, no tooltips |
| 5 | The same status shown three times | "Cloud Connected" in the header, the toolbar and the status bar; "Sync: Sync: 0 pending" repeats the word | Status was added wherever there was room |
| 6 | Three layers of navigation | Menu bar, then a button ribbon, then sub-tabs inside a screen | Grew screen by screen |
| 7 | Jargon | "GRN Inward", "FEFO Expiry Registry", "Batch", "Dismiss", "[F9] Sync Cloud", "Module:" | Written by developers for developers |
| 8 | Whole screens invisible | Tab bodies were hidden by a bad converter (fixed on 2026-10-27, see `TextEqualsConverter`) | A hidden failure with no test |
| 9 | About 3,000 lines of XAML with hard-coded colours and sizes | All views | No shared tokens, so every screen drifts |
| 10 | Layout depends on the window being large | Everything | No minimum window size, no responsive rules |

Items 1 to 4 and 10 are the "things overlapping" you reported. They are layout bugs, so the plan fixes them with
rules and automated checks (section 6 and 9), not by nudging margins.

## 3. Design principles

1. **One screen, one job.** The Sell screen only sells. Stock correction lives elsewhere.
2. **Words, not codes.** No abbreviations, no function-key labels as the main text, no internal terms.
3. **Big and forgiving.** Click and touch targets at least 48 px high. Body text at least 14 px. Destructive actions ask once,
   in plain words, and say what will happen. Where possible, offer Undo instead of a confirmation.
4. **Always say where the work is.** Every screen shows one honest status line: "Saved on this computer. 3 bills
   waiting to be sent to the cloud." Never a bare "Sync: 0".
5. **Errors say what to do.** Pattern: what happened, is my work safe, what do I press.
6. **Calm.** One accent colour, generous space, no flashing, no more than one primary button per area.
7. **Colour is never the only signal.** Every status pill has an icon and a word.

## 4. Visual language: "Frosted Pharmacy"

A light, airy look: soft tinted backdrop, frosted glass surfaces, one teal accent, rounded shapes. The "unique"
part is the backdrop and the way status is shown as friendly pills, not a stock Fluent look.

### 4.1 Layers

```
Layer 0  Backdrop      soft gradient mesh (teal to sky to lavender), static, never animated
Layer 1  Glass chrome  sidebar and top bar: frosted, blurred backdrop, 70 to 80 percent white tint
Layer 2  Glass cards   summary tiles and side panels: frosted, 1 px white border, soft shadow
Layer 3  Solid cards   anything with dense text or numbers: tables, forms, the bill: 96 percent white
Layer 4  Overlay       dialogs and toasts: frosted with a dim scrim behind
```

**Rule: glass for chrome and summaries, solid for reading and typing.** A frosted blur behind a table or a bill line
hurts legibility, and legibility is what low-experience users depend on.

### 4.2 How glass is built in Avalonia (and what can go wrong)

- Window: `TransparencyLevelHint="Mica, AcrylicBlur, Transparent, None"` with `ExtendClientAreaToDecorations`, so the
  real Windows 11 backdrop shows through the chrome. `Mica` where available, `AcrylicBlur` as the fallback.
- Panels: Avalonia's `ExperimentalAcrylicBorder` with a white tint and about 0.75 opacity, plus a 1 px
  `#FFFFFF66` border and a soft two-layer `BoxShadow`.
- **Fallback is mandatory.** Remote Desktop sessions, Windows 10 without effects, "transparency effects off", and
  low-end graphics all return no blur. The theme must look correct as frosted-looking solid colours (a light tint
  with the same border and shadow) when blur is unavailable.
- **"Reduce effects" switch** in Settings, defaulting to on for machines that fail a simple startup check. Pharmacies
  often run old PCs; the app must stay fast.
- Budget: at most 3 blurred surfaces visible at once. Blur is expensive when stacked.
- Contrast: text on glass must still reach 4.5:1 against the worst-case backdrop. Verified by a test that
  samples the rendered pixels (section 9), not by eye.

### 4.3 Tokens (all defined once in `Styles/Tokens.axaml`, no hex codes in views)

| Token | Light | Use |
|---|---|---|
| `Accent` | `#0D9488` | primary buttons, selected nav |
| `AccentSoft` | `#CCFBF1` | selected rows, soft highlights |
| `Ink` | `#0F172A` | primary text |
| `InkMuted` | `#475569` | secondary text (never lighter than this) |
| `Glass` | white at 75% | frosted chrome and cards |
| `GlassBorder` | white at 40% | edge highlight |
| `Surface` | `#FFFFFF` at 96% | solid cards |
| `Success`, `Warning`, `Danger`, `Info` | green, amber, red, blue | status only, always with icon and word |

Type scale (Segoe UI Variable, fallback Inter): 12 caption, **14 body (minimum)**, 16 emphasis, 20 section title,
28 page title, 36 big numbers (totals). Spacing on an 8 px grid (4, 8, 12, 16, 24, 32). Radii: 8 controls,
14 cards, pill for status. Motion: 120 to 180 ms fades and slides only, off when "Reduce effects" is on.

A dark theme is deferred (section 11). Tokens make it a later, contained change.

## 5. Information architecture: plain names, one navigation layer

Replace menu bar + button ribbon + sub-tabs with **a left sidebar** and, inside a screen, simple segmented tabs.

| Sidebar item | Replaces | What the person does |
|---|---|---|
| Home | (new) | See today at a glance, start the common jobs |
| Sell | POS Billing | Make a bill |
| Sales History | Sales Register & Invoices | Find an old bill, reprint, return |
| Medicines | Catalog Master | Look up, add, edit medicines |
| Stock | Stock (Store Inventory), Batches (FEFO Expiry Registry) | See what is in the shop, what is low, what expires soon |
| Buy from Suppliers | Purchases (PO) | Order from a supplier |
| Receive Stock | GRN Inward | Check in a delivery |
| Customers | Customer Directory & Dues | Find a customer, see what they owe |
| Reports | Reports | Daily totals, tax report |
| Problems and Sync | Sync Center (new), Diagnostics | See anything that did not reach the cloud, fix or remove it |
| Settings | Settings | Store, printer, device, sign out |

Keyboard shortcuts stay (staff who learned them keep them) but become small hints on the right of an item, not the
label. The sidebar collapses to icons at narrow widths.

Top bar (one row, never wraps over the content): page title on the left, the global search in the middle, then a
single **connection pill** ("Online", "Offline: working safely", "Sending 3 items...") and the user menu.
The duplicate connection badges are removed; the bottom status bar goes away and its useful content moves into the
pill and the screen's own status line.

## 6. Layout rules that prevent overlap

These are rules, not suggestions. Each is checkable.

1. **Minimum window 1024 x 680** (`MinWidth`, `MinHeight`). Designed and tested at 1024x680, 1280x720, 1920x1080,
   each at 100, 125 and 150 percent display scaling. (The app has so far only been looked at one size.)
2. **No fixed widths on anything that holds text.** Use `Grid` with `*` and `Auto` columns, `MinWidth`, `MaxWidth`.
3. **Every text element declares its overflow:** `TextWrapping="Wrap"` for sentences, `TextTrimming="CharacterEllipsis"`
   plus a tooltip for names and labels. No text can run under a neighbour.
4. **Toolbars wrap.** Button rows use a `WrapPanel`, or collapse secondary actions into a "More" menu below 1280 px.
5. **Messages never live inside a toolbar.** Notices go to a toast area (top right of the content, stacked,
   auto-dismiss after 6 seconds, errors stay until closed). The inline sentence squeezed between buttons is removed.
6. **Dense screens have a pinned footer.** On Sell, the totals and the "Complete bill" button are pinned to the bottom
   of their panel; the list above scrolls. Nothing is sized so it can be pushed off.
7. **Tables:** every column has a `MinWidth`; priority columns (name, quantity, price, total) never hide; low-priority
   columns hide below 1280 px; headers use full words, abbreviations only with a tooltip.
8. **Dialogs fit the window:** a maximum of 90 percent of the window height with an internal scroll region.
9. **Content max width of 1600 px, centred,** so ultra-wide screens do not stretch rows into unreadable lines.

## 7. Screens

### Shell
Frosted sidebar (left, 232 px, collapses to 72), slim frosted top bar, backdrop gradient behind everything, content
in solid and glass cards, toast region top right. Sign-in state, pairing and "offline" banners live in the top bar
pill, not as separate strips.

### Home (new)
Four glass tiles: Today's sales, Bills waiting to be sent, Running low, Expiring soon. Under them, three large
buttons: **Make a bill**, **Receive a delivery**, **Check stock**. A short "Needs your attention" list (failed sends,
expired stock) with one action each. This is the screen a new person sees first, and it replaces guessing.

### Sell
Left: big search box ("Scan or type a medicine name") then the bill as a solid card with large rows (name, how many,
price, total, a clear remove button). Right: customer (optional, collapsed by default), payment as three large
buttons (Cash, UPI, Card) not radio dots, then the pinned totals footer with a very large "Total" and a single green
**Complete bill** button. Keyboard path stays: scan, quantity, Enter.

### Medicines
Search first. The list is a solid card with the stock state as a pill (In stock, Running low, Out of stock).
"Add medicine" opens a **step-by-step panel** (1 Find or type the medicine, 2 Check details, 3 Done) instead of one
long form. "Import from global catalog" becomes **"Find in the Inventra medicine list"**, shows the list on open,
and each row has one **Add** button. Queue and pause become "Adding in the background" with a visible Pause/Resume.

### Stock
Two segmented tabs: **What I have** and **Expiring soon** (the batch/expiry view, with the nearest expiry first and
the words "Expires in 12 days" instead of a date alone). The low-stock filter is a prominent toggle.

### Buy from Suppliers and Receive Stock
Order and delivery become guided: pick the supplier, add items, review, send. Receiving a delivery has the order on
the left and what actually arrived on the right, so a missing item is obvious. "Free quantity" and unit conversion
(strips versus tablets) get plain labels and an inline example.

### Customers and Sales History
Search plus a solid list. Dues shown as "Owes Rs 1,250" with a Collect payment button.

### Problems and Sync (the current Sync Center, redone)
Language becomes: **"Did not reach the cloud"** (failed), **"Waiting to be sent"**. Each item is a card: what it
was in plain words ("Bill 0042 for Rs 110, Asha Rao"), why it was refused in plain words, and two buttons: **Try
again** and **Remove from the list** (with a required reason, and a plain warning about what removal means). A
single count in the sidebar badge tells people something needs attention.

### Settings and Diagnostics
Diagnostics moves under Settings > "Technical details" so day-to-day users do not see it.

### Sign-in and pairing
A full-bleed glass card on the backdrop, one field group at a time, friendly errors ("That password did not match.
Check Caps Lock and try again").

## 8. Component library (built once, used everywhere)

`GlassCard`, `SolidCard`, `SidebarItem`, `TopBar`, `ConnectionPill`, `StatusPill` (icon + word + colour), `ToastHost`,
`EmptyState` (illustration, one sentence, one button), `BigButton`, `SegmentedTabs`, `StepPanel`, `ConfirmDialog`
(says what will happen and offers Undo where possible), `HelpTip` (a "?" with a one-sentence explanation), `Money`
text (large, right-aligned, tabular figures), and a `DataTable` style (min widths, trimming, tooltips).

Icons: pick one icon set and use it everywhere (decision in section 11). Every icon has a text label beside it.

## 9. Making overlap impossible to ship

1. **Layout tests.** Avalonia headless tests render each screen at the three window sizes and assert that no two
   sibling controls' bounds intersect and that no text control is clipped (`DesiredSize` against `Bounds`). A failing
   test names the two controls.
2. **Screenshot gallery.** A script renders every screen at 3 sizes x 3 scales with no mouse input, writing a grid of
   images to `docs/ui-gallery/` for review before each merge. It uses Avalonia's own `RenderTargetBitmap`, not
   desktop screenshots or clicks (ad hoc desktop captures misled me twice while diagnosing today's problems).
3. **Contrast test.** Samples rendered pixels behind and under text on glass surfaces; fails below 4.5:1.
4. **Binding test.** Each view is loaded once headlessly so an invalid binding or a hidden-by-converter panel fails
   in CI instead of in front of a pharmacist. (This would have caught the blank screens and both crashes.)

## 10. Plain-language copy

| Today | Proposed |
|---|---|
| GRN Inward | Receive Stock |
| Batches (FEFO Expiry Registry) | Expiring soon |
| [F9] Sync Cloud | Send now |
| Sync: Sync: 0 pending | Everything is saved and sent |
| Dismiss | Remove from the list |
| PRICE_SNAPSHOT_INVALID | The price on the cloud changed after this bill was made. |
| Access Denied: ... | You do not have permission to do this. Ask the owner. |
| Cloud service unavailable (503) | Cannot reach the cloud right now. Your work is saved on this computer and will be sent when it is back. |
| Import to My Catalog | Add to my medicines |

Rules: sentences, not codes; active voice; say whether the work is safe; the button names the action
("Complete bill", not "OK"). Rupee amounts always formatted with the symbol and thousands separators.

## 11. Decisions (answered 2026-10-27)

| # | Question | Decision | Consequence in this plan |
|---|---|---|---|
| 1 | Language | **English only** from the start | No translations. All user-facing text still lives in one strings file (not scattered through XAML) so the copy review in section 10 is one pass and a later language is not a rewrite. |
| 2 | Icon set | **Material** (`Material.Icons.Avalonia`) | One icon set; every icon sits beside a text label. |
| 3 | Touch | **Yes, touch is supported** | Minimum target 48 px (not 44). Sell screen gets an on-screen number pad for quantity and amount. Lists scroll by drag. No hover-only actions: every action reachable by tap. Pointer and touch both tested. |
| 4 | Dark theme | **Deferred** | Tokens only, no dark variants built in phases 0 to 6. |
| 5 | Branding | **Teal is not final** | Colour lives in tokens only (`Accent`, `AccentSoft`), so changing it is a one-file edit. Teal stays as the working default until a logo or brand colour is supplied. Phase 1 ends with a palette review so it can be changed before the other screens are built. |
| 6 | Oldest supported Windows | **Windows 10 or newer** (Windows 7 requirement dropped, see below) | .NET 9 stays. Glass uses the real Windows 11 backdrop where available and a solid frosted look on older Windows 10. |

### Platform note: Windows 7 is not supported

The app is built on .NET 9, and Microsoft removed Windows 7, 8 and 8.1 support from .NET 7 onwards, so it cannot start
on those systems. The decision is to require **Windows 10 (version 1607 or newer) or Windows 11**. A Windows 7 build
would need a separate, out-of-support runtime, and Windows 7 itself has had no security patches since 2020, which is a
real risk for a billing system. Any Windows 7 counters need a PC upgrade before this version is installed. The
installer should check the Windows version and say so plainly instead of failing silently.

Because many counters will be older Windows 10 machines without the new backdrop effects, the **solid frosted look is
a first-class design**, not a fallback: it must look good on its own, and "Reduce effects" is tested at the same
standard as the glass look.

## 12. Delivery phases

| Phase | Work | Done when |
|---|---|---|
| 0. Foundations | `Tokens.axaml`, base styles, component library skeleton, min window size, layout/binding test harness, screenshot gallery | Harness runs in CI on the existing screens and lists today's overlaps |
| 1. Shell and Home | Sidebar, top bar, toast host, connection pill, backdrop, Home screen, remove menu bar/ribbon/status bar | Navigation works end to end; no overlaps at 3 sizes; accent colour reviewed and confirmed or changed |
| 2. Sell | New Sell screen with pinned footer, big payment buttons, on-screen number pad for touch | A new person bills a sample sale unassisted, by mouse and by touch, in a usability session |
| 3. Medicines and Stock | New lists, step-by-step add, "Find in the Inventra medicine list", background-add with pause | Global medicines visible on open; add works offline |
| 4. Buying | Order and receive flows, unit conversion labels | Delivery checked against an order with a missing item |
| 5. Problems, Settings, Sign-in | Plain-language Problems screen, Settings, glass sign-in | Every error string reviewed against section 10 |
| 6. Polish and test | Reduce-effects mode, DPI pass, accessibility pass, 3 real-staff usability sessions | Issues from the sessions closed |

Phases 0 and 1 are the foundation and take the longest; each later screen is faster because it reuses the
components. Business logic, repositories and sync are not touched: this is a view-layer rewrite, and the existing
161 desktop tests stay green throughout.

## 13. Risks

- **Glass on old hardware or Remote Desktop:** mitigated by the solid fallback, the budget of 3 blurred surfaces and
  the "Reduce effects" switch.
- **Legibility on glass:** mitigated by the solid-for-reading rule and the contrast test.
- **Scope:** a whole-UI rewrite is large. The phases are ordered so the app is shippable after every phase, with old
  screens still available until replaced.
- **Staff retraining:** mitigated by keeping keyboard shortcuts and by the Home screen's three big buttons.
