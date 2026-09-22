## Context

Obsidian Chronology provides a sidebar calendar view coupled with note metadata filtering and sorting presets. While users can save filter configurations to review specific subsets of notes, they currently lack:
1. Habit/review tracking (打卡 check-in) directly tied to each preset with visual feedback on the calendar grid.
2. Direct navigation to broad temporal bounds like a whole year, rolling 1/2/3/4 week windows, or the dynamic interval since the last check-in.
3. Automated handling to tag untracked/unlabeled notes created or edited since the previous review with a `todo` timestamp.

## Goals / Non-Goals

**Goals:**
- Provide one-click year selection (`selectYear`) in the calendar header.
- Provide a quick range dropdown at the top-right of the calendar with options for 1 week, 2 weeks, 3 weeks, 1 month, since last check-in, and all history.
- Implement an "All Dates" mode (`CalendarItemType.All`) that bypasses time bounds while applying all folder and metadata filters.
- Extend `FilterPreset` to store an auto-assigned vibrant color, check-in history (`checkIns: string[]`), and missing-property todo automation settings.
- Support both one-click "今日打卡" (Today check-in) and an interactive "打卡模式" (Punch-in mode) allowing users to toggle check-in directly on calendar day cells.
- Render distinct colored dots on calendar cells for all presets checked in on each day.
- Display a summary of days elapsed and note count since the active preset's last check-in.
- When checking in, automatically detect notes in the interval lacking the preset's configured attribute and write `todo: "YYYY-MM-DD"` to their YAML frontmatter.

**Non-Goals:**
- External task management syncing (e.g. Dataview tasks or Tasks plugin integration beyond standard frontmatter properties).
- Repeating recurrence rules / cron-like automated background triggers (check-in is user-triggered).

## Decisions

### 1. Representation of "All Dates" (`CalendarItemType.All`)
- **Decision**: Add `All = 5` to `CalendarItemType` in `src/CalendarType.ts`. In `CalendarItem.getTimeRange()`, return unbounded or infinite boundaries (or dedicated flag), and in `TimeIndex.getNotesForCalendarItem()`, if `item.type === CalendarItemType.All`, bypass date matching between `fromTime` and `toTime` while maintaining folder exclusions and note filter checks.
- **Alternatives considered**: Passing a dummy 100-year date range. *Rejected* because dummy ranges are brittle with historical or future notes and perform redundant date math.

### 2. Quick Range Dropdown Placement & Behavior
- **Decision**: Position a native `<select>` dropdown in the upper-right section of the calendar header. When changed, it updates `current` to a `CalendarItemType.Range` spanning `[startDate, today]` or `CalendarItemType.All`. If the user manually clicks a day or week in the calendar grid, the dropdown value automatically flips to `"custom"` (自选日期).
- **Alternatives considered**: Floating buttons along the right edge of the table. *Rejected* because sidebar width in Obsidian is often constrained (< 300px), where vertical buttons would either squeeze the calendar grid or wrap awkwardly.

### 3. Preset Color Palette & Check-in Storage
- **Decision**: Store `color: string` and `checkIns: string[]` directly inside each `FilterPreset` object. Colors are auto-assigned upon creation from a curated palette of 16 high-contrast, theme-compatible hex colors (such as `#4A90E2`, `#E06C75`, `#98C379`, `#E5C07B`, `#C678DD`, `#56B6C2`, `#D19A66`, `#BE5046`, `#61AFEF`, `#9B59B6`, `#1ABC9C`, `#E67E22`). Check-in dates are stored as ISO date strings (`YYYY-MM-DD`).
- **Alternatives considered**: Global check-in map in `ChronologyPluginSettings`. *Rejected* because associating check-ins with individual presets makes export, duplication, and preset deletion cleanly self-contained.

### 4. Interactive Punch-in Mode vs Normal Day Selection
- **Decision**: Introduce a toggleable "打卡模式" state in the preset bar. When inactive, clicking a calendar day selects that day to view notes. When active, clicking any calendar day toggles check-in for the active preset on that date without altering the note list selection.
- **Alternatives considered**: Modifier keys (e.g. `Alt+Click`). *Rejected* as touch/tablet devices running Obsidian Mobile cannot easily use modifier keys, and it lacks visual affordance.

### 5. Frontmatter Modification Implementation
- **Decision**: Utilize Obsidian's official `app.fileManager.processFrontMatter(file, (fm) => { fm[todoKey] = checkInDate; })` which safely edits the YAML frontmatter without destroying existing comments or formatting. If `todo` already exists on the note, it is overwritten with the latest check-in date as requested.
- **Alternatives considered**: Custom regex replacement on file content. *Rejected* due to risks of corrupting complex YAML metadata.

## Risks / Trade-offs

- **[Risk] Bulk frontmatter updates causing UI freeze on large note intervals** → **Mitigation**: Filter notes strictly by the active preset first before reading frontmatter cache; run `processFrontMatter` sequentially or in small asynchronous batches with a progress Notice.
- **[Risk] Narrow sidebar layout squeezing calendar cells** → **Mitigation**: Render check-in dots as small 4px badges positioned at the bottom of the date cell using CSS flex/grid without altering table cell dimensions.
- **[Risk] Preset deletion or renaming leaving orphaned check-in records** → **Mitigation**: Presets own their `checkIns` array, so deleting a preset naturally cleans up its check-in records.
