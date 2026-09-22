## ADDED Requirements

### Requirement: Preset Color Assignment and Persistence
The system SHALL assign a unique or random vibrant color to each filter preset upon creation, persist it in settings, and support color customization.

#### Scenario: Automatic color assignment on preset creation
- **WHEN** user saves a new preset
- **THEN** the system automatically assigns a color chosen from a pre-defined palette that is not currently used by other presets (or randomly if exhausted)
- **THEN** the color is stored in the `FilterPreset` record and persisted in plugin settings

---

### Requirement: Preset Check-in Actions
The system SHALL provide both a one-click "今日打卡" button and an interactive "打卡模式" to record check-in dates for the active preset.

#### Scenario: Today check-in via button
- **WHEN** user clicks "今日打卡" with an active preset selected
- **THEN** today's date (`YYYY-MM-DD`) is appended to the active preset's `checkIns` array (if not already present)
- **THEN** settings are saved and the UI updates to reflect the new check-in state

#### Scenario: Toggling punch-in mode
- **WHEN** user toggles "打卡模式" on
- **THEN** clicking any date cell in the calendar grid toggles the check-in status for that date under the active preset rather than changing note selection
- **WHEN** user toggles "打卡模式" off
- **THEN** clicking date cells resumes standard note date selection

---

### Requirement: Multi-Color Check-in Indicators on Calendar
The system SHALL display colored dots or badges on calendar date cells representing all presets that checked in on that date.

#### Scenario: Rendering check-in dots for multiple presets
- **WHEN** one or more presets have a check-in recorded for a specific date
- **THEN** that date cell renders small colored indicator dots matching the respective presets' colors
- **THEN** hovering over the dots displays a tooltip listing the names of the checked-in presets

---

### Requirement: Elapsed Time and Note Count Since Last Check-in
The system SHALL calculate and display the number of days elapsed and the count of notes matching the preset since the active preset's most recent check-in.

#### Scenario: Displaying stats when previous check-in exists
- **WHEN** an active preset with previous check-ins is selected
- **THEN** the preset info bar displays the last check-in date, the elapsed days from that date to today, and the number of matching notes within that interval

#### Scenario: Displaying stats when no check-in exists
- **WHEN** an active preset with no check-in history is selected
- **THEN** the preset info bar indicates that no check-in has been recorded yet
