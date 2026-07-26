## Why

The current note chips after each filename are cramped and sometimes truncate the most useful part of the metadata. Users need to scan values quickly, keep the field name available on hover, and handle status-style emoji values without losing readability.

## What Changes

- Show property values as the primary chip text instead of `name: value`.
- Preserve the property name in a tooltip on hover.
- Support tag-style entries and status values in the displayed metadata set.
- Keep Unicode emoji values readable in the chip presentation.
- Add configurable sorting for displayed chips so notes with properties surface more consistently.

## Capabilities

### New Capabilities
- `note-property-chip-display`: Display note metadata chips with value-first text, hoverable property names, emoji-friendly rendering, and deterministic sorting.

### Modified Capabilities

## Impact

- `src/Views/NoteView.tsx` chip rendering
- `src/noteFilterSettings.ts` displayed-metadata formatting
- `styles.css` chip layout and hover behavior
- `tests/time-index-settings.test.mjs` and new tests for display/sorting behavior
- `src/ChronologySettingTab.ts` settings copy if display options are exposed there
