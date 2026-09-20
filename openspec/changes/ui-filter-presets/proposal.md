## Why

Obsidian Chronology provides a multi-parameter filtering and sorting bar in the calendar sidebar (date display mode, filter kind, query keywords, invert filter, sort by time vs. property, and sort direction). However, switching between different workflows (such as checking uncompleted tasks with specific frontmatter properties vs. reviewing daily journal notes or project-specific logs) currently requires manual re-selection and typing every time. Adding preset configuration management directly inside the existing two-row filter UI enables users to save, load, update, rename, and delete frequently used filter combinations with minimal clicks.

## What Changes

- Add a preset configuration trigger button on the left of the second row in the sidebar filter UI (`[ 🔖 预设 ▼ ]`), preserving the existing two-row layout and all current controls (including date mode, filter type, sort buttons, query input, and invert checkbox).
- The preset trigger button displays the currently active preset name (truncated with ellipsis if long), and shows a modified indicator (`*`) when filter parameters deviate from the saved preset.
- Clicking the preset button opens an Obsidian native context `Menu` allowing users to:
  - Select and immediately load any saved preset into the filter controls.
  - Save current filter/sorting parameters as a new preset via an input `Modal`.
  - Overwrite/update the currently active preset with the current filter state.
  - Rename the active preset via an input `Modal`.
  - Delete the active preset with confirmation.
- Persist presets and active preset state across sessions in `ChronologyPluginSettings`.

## Capabilities

### New Capabilities
- `filter-presets`: Management and execution of customizable filter and sort presets in the Chronology sidebar UI, including creation, loading, updating, renaming, deletion, and settings persistence.

### Modified Capabilities
<!-- Existing capabilities whose REQUIREMENTS are changing (not just implementation).
     Only list here if spec-level behavior changes. Each needs a delta spec file.
     Use existing spec names from openspec/specs/. Leave empty if no requirement changes. -->

## Impact

- `src/main.ts`: Extend `ChronologyPluginSettings` with `presets: FilterPreset[]` and `activePresetId?: string | null`, and normalize these fields during settings load/save.
- `src/Views/CalendarContainer.tsx`: Add the preset button in the second filter row, bind state for active preset and dirty tracking, and integrate the native `Menu` and prompt `Modal`s.
- `styles.css`: Add styling for the preset trigger button and dirty indicator to ensure responsive layout within narrow sidebars.
- Backward compatibility: Existing user settings without presets will default to an empty preset list with no breaking changes.
