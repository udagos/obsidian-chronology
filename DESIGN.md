# Chronology Design System

## Intent

Chronology is a compact Obsidian sidebar tool. The interface should feel native to Obsidian: dense, calm, keyboard/mouse friendly, and easy to scan in a narrow pane.

## Tokens

- Use Obsidian CSS variables for all colors: `--background-primary`, `--background-secondary-alt`, `--background-modifier-border`, `--text-normal`, `--text-muted`, `--text-faint`, `--interactive-accent`, `--interactive-accent-hover`, `--color-green`, and `--color-orange`.
- Keep spacing on a 2px/4px rhythm. Sidebar controls should stay compact and avoid large card surfaces.
- Use inherited Obsidian typography. Do not introduce custom fonts.

## Components

- Calendar grid: existing bordered table, compact cells, accent selection.
- Filter toolbar: full-width native-feeling control strip below the calendar. Controls use small buttons, selects, text inputs, and checkboxes.
- Note row: single-line row with the title on the left and right-aligned metadata chips. Rows must truncate cleanly in narrow panes.
- Metadata chip: small muted inline label with a subtle border/background, used only for date type and configured note properties.

## Interaction

- Hover states should use Obsidian native background and text colors.
- Locking filter settings saves the current sidebar filter state as the default for future view opens.
- No decorative animation. State changes should be immediate and legible.

## Accessibility

- Native form controls remain keyboard accessible.
- Buttons must have visible text or a `title`.
- Do not encode date type by color only: created/modified chips include text labels.
