## ADDED Requirements

### Requirement: Preset Missing-Property Rule Configuration
The system SHALL allow configuring a missing-property check rule per preset, defining which frontmatter property must be present on a note to avoid automated todo tagging.

#### Scenario: Configuring missing property rule in preset settings
- **WHEN** user configures a preset via the preset prompt modal
- **THEN** user can specify a property name to inspect (e.g. `status` or `reviewed`) and the target todo attribute name (defaulting to `todo`)

---

### Requirement: Automated Frontmatter Todo Attribute Injection on Check-in
The system SHALL scan notes within the check-in interval that match the preset filter, and for notes lacking the configured property, automatically add or overwrite the frontmatter `todo` attribute with the check-in date.

#### Scenario: Adding todo to notes lacking the configured property
- **WHEN** a check-in is performed for a preset that has a missing-property rule configured
- **THEN** the system finds all notes within the interval `[lastCheckInDate, currentCheckInDate]` that match the preset filter
- **THEN** for each matching note that does not possess the configured property (or has it empty/undefined), the system updates its frontmatter to set `todo: "YYYY-MM-DD"` (using the check-in date)
- **THEN** if a note already contains a `todo` property, its value is overwritten with the new check-in date

#### Scenario: Skipping notes that possess the configured property
- **WHEN** a matching note in the check-in interval already has the configured property defined
- **THEN** the note's frontmatter remains unmodified

#### Scenario: Check-in without configured missing-property rule
- **WHEN** a check-in is performed for a preset with no missing-property rule configured
- **THEN** only the check-in date record is saved, and no note frontmatter modifications are executed
