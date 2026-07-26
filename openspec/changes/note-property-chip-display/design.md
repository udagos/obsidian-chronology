## Context

The chronology view already reads `displayedProperties` and renders them as chips in `NoteView`. At the moment those chips are value-lite in some cases and can overflow visually when the value is long. The user wants the value to be the main signal, the property name to live in hover text, emoji-like status values to stay readable, and sorting to become more predictable.

## Goals / Non-Goals

**Goals:**
- Make chip text value-first and compact.
- Preserve property names via tooltip.
- Keep emoji values legible in the current UI.
- Add deterministic ordering for displayed chips and note ordering.

**Non-Goals:**
- Do not redesign the whole chronology layout.
- Do not add a new metadata editor.
- Do not introduce a heavy emoji rendering library unless a later change proves it necessary.

## Decisions

- Use the existing chip surface in `NoteView` and change its content model rather than inventing a new metadata panel. This keeps the change localized and low-risk.
- Render the property value as the visible label and place the property name in `title`/tooltip text. This preserves scanning speed while keeping the field identifiable.
- Treat emoji values as ordinary rendered text first. Native emoji glyphs are already supported by the platform, so that is the simplest reliable path. If a future requirement needs image-style emoji, it should be a separate capability with explicit asset mapping.
- Sort displayed chips with a stable rule before render. Stable ordering is important because note metadata can come from frontmatter, tags, and configured display lists.
- Keep note-level sorting separate from chip-level sorting unless the user explicitly wants the chronology list reordered. This avoids accidental behavior changes in calendar navigation.

## Risks / Trade-offs

- [Tooltip-only property names] -> Hover text is less discoverable on touch devices.
- [Native emoji rendering] -> Emoji appearance varies by platform and theme.
- [Sorting behavior] -> Changing note order can surprise users if the rule is not visible in settings.
- [Long values] -> Value-first chips can still overflow if the value itself is long; truncation policy may need a follow-up.

## Migration Plan

1. Update chip rendering and sorting logic behind the existing displayed-properties setting.
2. Expand tests for value-first rendering, tooltip content, emoji values, and ordering.
3. Verify the view on a note set with long values, multiple properties, and emoji status fields.
4. If note ordering changes are too broad, keep chip ordering only and defer note ordering to a follow-up change.

## Open Questions

- Should note-level sorting by property value be user-configurable, or always on once the feature ships?
- Should emoji-style status values be rendered as plain Unicode glyphs only, or mapped to image assets later?
- Should property names be shown on hover only, or also in an accessible label for keyboard/screen-reader users?
