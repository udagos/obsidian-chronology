## 1. Data and Formatting

- [x] 1.1 Define the chip display model so value text and property name/tooltip are separated cleanly.
- [x] 1.2 Normalize displayed metadata so tags, properties, and status-style values sort deterministically.
- [x] 1.3 Decide how emoji values are treated in the formatter and keep them stable in plain text rendering.

## 2. UI Rendering

- [x] 2.1 Update `NoteView` to render value-first chips with hover text for the property name.
- [x] 2.2 Adjust chip CSS so long values and multiple chips stay readable in the current layout.
- [x] 2.3 Preserve the existing note label, time label, and click behavior while changing chip content.

## 3. Sorting and Behavior

- [x] 3.1 Add deterministic sorting for displayed chips within a note.
- [x] 3.2 Add note-level ordering rules for property-aware sorting where enabled.
- [x] 3.3 Keep sorting stable for notes with no displayed metadata.

## 4. Verification

- [x] 4.1 Extend tests for value-first rendering and tooltip content.
- [x] 4.2 Extend tests for emoji-valued properties.
- [x] 4.3 Extend tests for chip ordering and note ordering behavior.
