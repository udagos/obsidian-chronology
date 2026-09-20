## Context

The Chronology plugin displays a calendar and a note list/timeline in an Obsidian sidebar leaf. Beneath the calendar, `CalendarContainer.tsx` renders a two-row filter bar:
1. Row 1: Date display mode (`both`, `created`, `modified`), Filter kind (`all`, `tag`, `property`, `folder`), and three sort buttons (`属性`, `时间`, `↓`/`↑`).
2. Row 2: Query input (`multiple comma-separated`) and Invert checkbox (`反向`).

Users need a quick way to save, load, update, rename, and delete preset configurations directly from the UI without occupying extra vertical rows or removing any existing controls.

## Goals / Non-Goals

**Goals:**
- Maintain the existing two-row compact layout without removing or altering existing controls.
- Provide a preset trigger button `[ 🔖 预设 ▼ ]` positioned on the left side of Row 2.
- Display the current preset's name on the button (e.g. `[ 🔖 工作待办 ▼ ]`), with an asterisk `*` dirty indicator when filter/sort state is altered compared to the preset.
- Open Obsidian native `Menu` on click to allow loading any preset, saving current as new, updating current, renaming, and deleting.
- Use lightweight Obsidian `Modal` prompts for naming and renaming presets.
- Persist preset definitions and active preset ID in plugin data settings.

**Non-Goals:**
- Include note displayed properties (`displayedProperties`) or custom tags chips in the filter preset (presets focus strictly on the filter and sorting parameters).
- Provide complex multi-step preset rule builders or preset hotkeys.
- Ship pre-packaged default presets (user starts with an empty preset collection and defines their own).

## Decisions

### Decision 1: Preset Data Model and Placement in Settings
**Choice**: Store presets as an array `FilterPreset[]` inside `ChronologyPluginSettings`, along with `activePresetId?: string | null`.

```typescript
export interface FilterPreset {
    id: string;                      // Timestamp or unique string ID
    name: string;                    // User-defined name
    dateDisplayMode: DateDisplayMode;// 'both' | 'created' | 'modified'
    filterKind: NoteFilterKind;      // 'all' | 'tag' | 'property' | 'folder'
    filterQuery: string;             // Raw query text string
    filterInvert: boolean;           // Invert checkbox state
    sortByTime: boolean;             // Sort by time vs property
    sortDesc: boolean;               // Sort direction
}
```

*Alternatives considered*:
- Store in a separate file (e.g. `presets.json`): Adds unnecessary I/O complexity; `settings.json` via Obsidian's `loadData` / `saveData` is standard and safe for small structured objects.

### Decision 2: Button Placement in Row 2
**Choice**: Place `[ 🔖 预设 ▼ ]` at the start of Row 2 before the search input.
Row 2 layout:
`[ 🔖 预设 ▼ ] [ input (flex: 1 1 auto) ] [ ☑ 反向 ]`

*Rationale*:
- Row 1 already contains 5 controls and has ~240-260px fixed footprint, making it prone to overflow in narrow sidebars.
- Row 2 has a flexible input field that naturally absorbs width changes.
- Setting `max-width: 100px`, `text-overflow: ellipsis`, and `white-space: nowrap` on the preset button keeps the layout robust even with long preset names.

### Decision 3: Obsidian Native `Menu` for Preset Operations
**Choice**: Trigger `new Menu().showAtPosition(...)` or `showAtMouseEvent(evt)`.

Menu structure:
- Items 1..N: Each saved preset with a checkmark if active (`.setChecked(isActive)`).
- Separator.
- `💾 保存当前为新预设...` -> Opens `PresetPromptModal`.
- Contextual items when an active preset is selected:
  - `🔄 覆盖更新到 "${activePreset.name}"` -> Overwrites preset fields with current state.
  - `✏️ 重命名 "${activePreset.name}"...` -> Opens `PresetPromptModal` prefilled with current name.
  - `🗑️ 删除 "${activePreset.name}"` -> Removes preset after confirmation, resets active ID.
- Contextual submenu when presets exist and no preset is selected:
  - `🗑️ 删除预设 >` submenu listing all presets to delete.

*Alternatives considered*:
- Custom HTML popup: Harder to match Obsidian themes, mobile gestures, and dark/light mode styles. Obsidian's `Menu` handles focus, positioning, outside clicks, and theme integration out of the box.

### Decision 4: Dirty State Tracking
**Choice**: Compare current states (`dateMode`, `filterKind`, `filterQuery`, `filterInvert`, `sortByTime`, `sortDesc`) with the currently active preset.
If any field differs, append `*` to the button label (e.g. `工作待办*`).
When the user clicks "覆盖更新", the saved preset updates to match current state and `*` disappears.

## Risks / Trade-offs

- **[Risk] Long preset names crowding the input box in narrow sidebars**
  → *Mitigation*: Enforce `max-width: 90px` or `100px`, with `text-overflow: ellipsis` and `overflow: hidden`, plus a full name `title` attribute for tooltip display.
- **[Risk] Accidental deletion of frequently used presets**
  → *Mitigation*: Show an Obsidian confirmation notice or dialog modal before deleting a preset.
- **[Risk] Settings corruption or stale active ID**
  → *Mitigation*: Provide validation during `loadSettings()`: ensure `presets` is an array of valid `FilterPreset` objects, and clear `activePresetId` if it doesn't match any existing preset.
