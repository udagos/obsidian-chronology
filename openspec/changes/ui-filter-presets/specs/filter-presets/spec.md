## ADDED Requirements

### Requirement: Preset Trigger Button in Filter Bar
The system SHALL render a preset trigger button at the start of the second row of the filter bar in the calendar sidebar, maintaining the existing two-row filter layout without removing or repositioning existing controls.

#### Scenario: Default appearance when no preset is active
- **WHEN** the calendar sidebar view is loaded with no active preset
- **THEN** the preset button displays the default text `预设` with a dropdown arrow indicator

#### Scenario: Appearance when an active preset is selected
- **WHEN** a preset is loaded as active
- **THEN** the preset button displays the name of that preset (truncated with ellipsis if exceeding max width)

#### Scenario: Dirty indicator when parameters are modified
- **WHEN** an active preset is loaded and the user alters any filter or sort control (date mode, filter kind, query, invert, sort dimension, or sort direction)
- **THEN** the preset button appends an asterisk `*` to the displayed preset name

---

### Requirement: Preset Menu Display and Loading
The system SHALL display an Obsidian native context menu when the preset button is clicked, listing all user-defined presets and available preset management actions.

#### Scenario: Opening the preset menu with saved presets
- **WHEN** user clicks the preset trigger button
- **THEN** a native context menu opens displaying all saved presets in chronological or custom order, with a checkmark indicating the currently active preset (if any)

#### Scenario: Loading a preset from the menu
- **WHEN** user clicks a saved preset item in the menu
- **THEN** the system immediately updates all filter controls (`dateDisplayMode`, `filterKind`, `filterQuery`, `filterInvert`, `sortByTime`, `sortDesc`) to the preset's saved values, re-filters the displayed notes, clears any dirty indicator, and saves the active preset ID

---

### Requirement: Saving Current Configuration as a New Preset
The system SHALL allow saving the current filter and sort configuration as a new named preset.

#### Scenario: Creating a new preset via modal prompt
- **WHEN** user clicks "保存当前为新预设..." from the preset menu
- **THEN** a prompt modal opens requesting a preset name
- **WHEN** user submits a non-empty name
- **THEN** a new `FilterPreset` record is created with current filter/sort parameters, appended to saved settings, set as the active preset, and persisted to disk

#### Scenario: Handling empty or duplicate name on creation
- **WHEN** user submits an empty or whitespace-only name
- **THEN** the system displays a notice and prevents creating an empty preset

---

### Requirement: Updating an Active Preset
The system SHALL allow overwriting the configuration of the currently active preset with the current filter/sort state.

#### Scenario: Overwriting active preset parameters
- **WHEN** an active preset is selected and has modifications (dirty state) and user clicks "覆盖更新到..."
- **THEN** the system updates that preset's stored parameters to the current values, persists settings, and clears the dirty indicator

---

### Requirement: Renaming an Active Preset
The system SHALL allow renaming the currently active preset.

#### Scenario: Renaming active preset via modal
- **WHEN** an active preset is selected and user clicks "重命名..." from the preset menu
- **THEN** a prompt modal opens prefilled with the preset's current name
- **WHEN** user submits a new valid name
- **THEN** the preset's name is updated in settings, persisted to disk, and the button label updates immediately

---

### Requirement: Deleting a Preset
The system SHALL allow deleting presets from the plugin settings.

#### Scenario: Deleting the currently active preset
- **WHEN** an active preset is selected and user clicks "删除..." from the preset menu
- **THEN** the system asks for confirmation or directly confirms deletion, removes the preset from settings, clears active preset state, resets the button text to `预设`, and persists settings

#### Scenario: Deleting when no preset is active
- **WHEN** no preset is currently active but saved presets exist
- **THEN** the preset menu provides a submenu listing presets available for deletion
