## Why

Obsidian Chronology currently provides a calendar and multi-parameter filter presets, but users lack a seamless way to track regular review habits (打卡 check-ins) associated with their specific presets, lack automated workflows to mark overlooked notes as todos when completing a review cycle, and face friction when navigating across broader time horizons such as whole years, rolling multi-week windows, or the span since the last review.

Adding preset check-ins with multi-colored visual indicators, automated todo frontmatter injection for untagged notes, and quick time span navigation bridges review planning, habit tracking, and note lifecycle management into a unified sidebar experience.

## What Changes

- **Header & Scope Navigation**:
  - Enable year selection in the calendar header (`selectYear`), allowing one-click switching to a whole-year view (`CalendarItemType.Year`).
  - Introduce an "All Dates" (`CalendarItemType.All`) query mode that displays notes matching the active filter across the entire vault without date boundaries.
- **Quick Range Selector (Right Dropdown)**:
  - Add a quick range dropdown selector at the top-right of the calendar interface with options:
    - 自选日期 (Custom / cell selection)
    - 最近一周 (Last 1 week / 7 days)
    - 最近二周 (Last 2 weeks / 14 days)
    - 最近三周 (Last 3 weeks / 21 days)
    - 最近一月 (Last 1 month / 30 days)
    - 到当前预设上次打卡 (Range from active preset's last check-in to today)
    - 全部历史 (All historical dates)
- **Preset Check-in & Habit Tracking**:
  - Extend presets (`FilterPreset`) with random vibrant color assignment (`color`) and check-in date history (`checkIns: string[]`).
  - Add a "今日打卡" (Check-in Today) button to quickly record a check-in for the active preset.
  - Add a "打卡模式" (Punch-in Mode) toggle that allows users to directly click any date cell in the calendar to toggle check-ins for the active preset.
  - Render colored check-in dots/badges on calendar cells corresponding to all presets that checked in on that date, supporting multiple presets per day.
  - Display check-in statistics for the active preset: time elapsed since last check-in (e.g. "距上次打卡 5 天") and count of matching notes created/modified in that interval.
- **Automated Frontmatter Todo Property Injection**:
  - Allow each preset to configure a missing-property check rule (e.g., if a note lacks a specified property such as `status`).
  - When a check-in is performed, scan all notes within the interval since the last check-in that match the preset filter: if a note lacks the specified property, automatically inject or overwrite frontmatter with `todo: "YYYY-MM-DD"`.

## Capabilities

### New Capabilities
- `preset-checkin`: Habit tracking and check-in mechanism for filter presets, including today punch-in button, direct calendar cell punch-in toggle mode, colored dots on calendar cells with auto-assigned preset colors, and elapsed days/notes counter.
- `note-todo-automation`: Automated frontmatter `todo` attribute injection/overwriting for notes within the check-in interval that lack a preset-specified property.
- `calendar-range-navigation`: Calendar navigation enhancements including year-level browsing, "All Dates" mode, and a right-hand quick time range dropdown selector (1w, 2w, 3w, 1m, since last check-in, all history).

### Modified Capabilities
<!-- None: existing presets and calendar capabilities are extended backward-compatibly -->

## Impact

- `src/CalendarType.ts`: Add `CalendarItemType.All` and update time range resolution logic.
- `src/TimeIndex.ts`: Handle `CalendarItemType.All` to bypass date filtering while maintaining folder exclusions and property/keyword filters.
- `src/noteFilterSettings.ts`: Update `FilterPreset` interface with `color`, `checkIns`, `missingPropertyToTodo`, and `todoPropertyName`.
- `src/Views/Calendar.tsx`: Enable year selection, render check-in dots on calendar cells, support punch-in click handling when punch-in mode is active, and add the quick range dropdown selector in the header/right area.
- `src/Views/CalendarContainer.tsx`: Add check-in status display, punch-in mode toggle, check-in button, and the frontmatter injection logic via `app.fileManager.processFrontMatter`.
- `src/Views/PresetPromptModal.ts`: Add configuration fields for missing-property check and optional custom color selection when creating or editing presets.
- `styles.css`: Add styles for check-in dots, quick range dropdown, punch-in mode indicator, and check-in summary bar.
