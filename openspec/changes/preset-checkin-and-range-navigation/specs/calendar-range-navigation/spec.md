## ADDED Requirements

### Requirement: Year and Month Scope Selection in Calendar Header
The system SHALL allow selecting a whole year by clicking the year label in the calendar header, and a whole month by clicking the month label in the header.

#### Scenario: Clicking the year label
- **WHEN** user clicks the year label in the calendar header
- **THEN** the active calendar item is updated to `CalendarItemType.Year` with the current year
- **THEN** the calendar highlights the year as selected and displays all notes for that year matching active filters

#### Scenario: Clicking the month label
- **WHEN** user clicks the month label in the calendar header
- **THEN** the active calendar item is updated to `CalendarItemType.Month` with the current month
- **THEN** the calendar highlights the month as selected and displays all notes for that month matching active filters

---

### Requirement: All Dates Query Mode
The system SHALL provide an "All Dates" mode that displays all vault notes matching the active filter criteria without any temporal restrictions.

#### Scenario: Selecting All Dates mode
- **WHEN** user selects "全部历史" (All Dates) from the range selector
- **THEN** the active calendar item is set to `CalendarItemType.All`
- **THEN** the note index returns all non-excluded notes in the vault that satisfy the active note filter regardless of creation or modification timestamps

---

### Requirement: Quick Range Dropdown Selector
The system SHALL render a quick range dropdown selector at the top-right of the calendar interface providing pre-configured rolling time horizons.

#### Scenario: Selecting rolling week and month ranges
- **WHEN** user selects "最近一周", "最近二周", "最近三周", or "最近一月" from the dropdown
- **THEN** the calendar item is updated to a `CalendarItemType.Range` spanning from (Today - N days) to Today
- **THEN** the calendar grid displays the date range as selected and the note list updates accordingly

#### Scenario: Selecting range to last check-in of active preset
- **WHEN** user selects "到当前预设上次打卡" from the dropdown and the active preset has at least one check-in
- **THEN** the calendar item is updated to a range spanning from the active preset's most recent check-in date to Today

#### Scenario: Handling range to last check-in when no check-in exists
- **WHEN** user selects "到当前预设上次打卡" but the active preset has no check-in history
- **THEN** the system displays a notice informing the user and retains the previous date selection

#### Scenario: Reverting dropdown to custom on manual cell click
- **WHEN** user clicks an individual day or week cell in the calendar grid while a quick range is active
- **THEN** the dropdown value automatically updates to "自选日期" (Custom)
