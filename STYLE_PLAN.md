# 2009 VampireFreaks look — restyle plan

Goal: make VampireFreeks feel like vampirefreaks.com around 2008–2009, not like a generic
"red goth" template. Original art only (no copied logo or images), per PLAN.md.

## Evidence (web.archive.org is blocked from this environment)

Sources used instead:

1. **userstyles.org archive** (`uso-archive/data`, styles dated 2007-07 → 2010-01). These
   restyled the live site, so their selectors and the colors they override expose the
   real 2008–09 markup and defaults:
   - Layout is **tables**: `table.main`, `.maintop` (logo row, ~45px tall image logo
     centred), `#menu0` (top menu, ~**750px** wide, centred), `.menu` / `.menu2`
     (menu rows), `.side_td` + `table.leftnav` (left nav column), `.side_td[align=right]`
     (right column: Top Boys / Top Girls), `table.heading`, `.mainheading`.
   - Boxes: `.darkbox`, `table[bgcolor="#151515"]`, `.sidemenu_header` / `.sidemenu_box`,
     `.newsbox`, `.membersonline`, `.lateststuffheader`/`.lateststuff`, `.featnews`,
     `.featinterviews`, `.musicstorebox`, `.assimilate_but` (the join button).
   - Lists alternate rows with `tr[bgcolor="#222222"]` / `tr[bgcolor="#000000"]`
     with 20px icon cells (forum topic rows).
   - Default top-menu text was **white**; "#bb55dd — vf's purple" (style 6116, 2008);
     other styles swap menu bg to `#232323` and borders to `#2e2e2e`/`#343434`/`#444`.
   - Several styles force **Verdana 10–11px**, i.e. that's close to the original.
   - Home page (logged in): `.loggedin` table, latest cult updates table
     (`.latestupdates`, border `#343434`), online friends box with 50×50 `.friendicon`.
2. **vampirefreaks.net** (2026 revival, built from a reference screenshot): chrome is
   **hot magenta/pink** (`#cf1d7a`, bright `#ff63b4`) on near-black, crimson only as a
   secondary highlight, blackletter only for the wordmark, nav
   `HOME PROFILES FRIENDS JOURNALS CULTS PICS MUSIC EVENTS SITE`, live "freak count",
   left member sidebar, right rails (Top Cults / Top Journals / Newest Freaks).

## What's wrong now (`src/styles/retro.css`, `src/App.svelte`)

| Now | 2009 VF |
|---|---|
| Red (`#e0002a`) everywhere, red gradients on header, boxes, buttons | Neutral black/charcoal surfaces; **magenta-purple** accents; red is rare |
| Glowing red blackletter logo + red radial body glow | Image wordmark in a 45px header row, flat black page |
| Full-width flex nav with red hover blocks | Centred ~750px table menu, white small bold text, gray/purple row |
| Red gradient box headers, 1px dark-red borders | `#151515` boxes, `#222`/`#2e2e2e`/`#343434` borders, small bold header text |
| 980px fluid wrap, CSS grid columns | Fixed ~780px centred page: left nav (~150px) · content · right rail |
| Green ticker, 88×31 badges | Neither is VF-specific (keep badges small in footer, drop ticker or restyle) |

## Plan

### 1. Tokens (`retro.css :root`)
```
--bg: #000;        --panel: #151515;   --panel2: #1c1c1c;   --row-alt: #222222;
--line: #2e2e2e;   --line2: #343434;   --line3: #444;
--text: #cccccc;   --dim: #888;        --white: #fff;
--accent: #bb55dd; (VF purple)  --accent2: #cf1d7a; (hot pink)  --accent3: #ff63b4;
--menu-bg: #232323; --menu-dark: #2e1d3f; --menu-border: #5d4270;
--link: #bb55dd → hover #ff63b4;  --red: #cc0033 (warnings / ratings only)
--font: Verdana, Tahoma, sans-serif; base 11px, small 9–10px
```
Remove the body radial gradient and all `text-shadow` glows.

### 2. Page shell (`App.svelte`)
- `.wrap` → fixed **780px** centred (fluid below 720px for mobile, keep current breakpoint).
- Header row (`.maintop`): left-aligned wordmark ~45px tall (our own SVG/PNG in
  `public/`, white/gray with a pink accent — not a glowing red blackletter), right side
  "freak count" + logged-in user links in 10px gray.
- Top menu (`#menu0`): two thin rows like `.menu`/`.menu2` — row 1 main sections in white
  bold 10px caps on `#232323`, separated by `|`; row 2 (when logged in) My Profile ·
  Messages · Friends · Upload · Settings in `--accent`. Hover = text colour change only.
- Body: 3-column table-like layout everywhere (`.cols3`): **left nav 150px**
  (vertical link list, `.leftnav` box), **content**, **right rail 160–180px**
  (Members online, Top Freaks, Newest Freaks, Top Cults).
- Footer: plain gray 9px link row; badges shrunk and moved below.

### 3. Boxes and lists
- `.box` → `#151515` bg, `1px solid #2e2e2e`, no gradient.
- `.box-h` → `#1c1c1c` or `#2e1d3f` bar, 10px bold **white**, lowercase/Title case
  (VF headers weren't all-caps red), optional small pink "more »" link on the right.
- `table.list` → rows alternate `#222222` / `#000000`, 20px icon column, no red header.
- `.darkbox` utility for nested inset panels.
- Thumbnails/avatars: 1px `#444` border, 50×50 friend icons, 4px gutters.

### 4. Controls
- Buttons: flat `#232323` with `1px #444` border, white 10px text; primary/join button
  (`.assimilate`) in magenta `#cf1d7a`. No red gradients.
- Inputs: `#1c1c1c` bg, `#2e2e2e` border, `#d6d6d6` text, focus border `--accent`.
- Tabs: gray tabs, active tab `--accent` underline/background.

### 5. Page-specific passes
- **Home**: logged out → big "assimilate" join box + featured pics + news; logged in →
  `.loggedin` grid: latest cult updates table, online friends icons, site news.
- **Profile**: keep user layouts in the iframe; default (no-layout) profile uses VF
  table look: pic left, stats table (`table.kv`) right, rating bar, comments.
- **Forums / Cults**: topic tables with alternating rows and icon cells.
- **Pics**: thumbnail grid, 1–10 rate row as small gray buttons, selected = pink.

### 6. Verify
- Playwright screenshots of home, profile, forums, cults, pics at 1024px and 375px;
  compare against reference screenshots once available.
- `npm run check && npm test` must stay green.

## Still needed to confirm exact values
Wayback screenshots/HTML can't be fetched here. To pin exact pixels/hex values, either
allow `web.archive.org` in the environment's network settings or drop 2–3 screenshots
(home, profile, forum) into `docs/ref/`; step 6 then diffs against them.
