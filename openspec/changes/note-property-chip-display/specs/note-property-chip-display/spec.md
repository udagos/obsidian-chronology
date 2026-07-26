## ADDED Requirements

### Requirement: Value-first metadata chips
The system SHALL render displayed note metadata chips using the property value as the visible chip text. The property name SHALL remain available through a hover tooltip or equivalent affordance.

#### Scenario: Property value is shown
- **WHEN** a note has a displayed property such as `status: draft`
- **THEN** the chip text SHALL show `draft`
- **AND** the property name SHALL be exposed in a tooltip

### Requirement: Emoji values remain readable
The system SHALL render single-character emoji values in displayed chips without replacing them with a broken placeholder or truncating them away.

#### Scenario: Status property contains emoji
- **WHEN** a displayed property value is a Unicode emoji such as `📌`
- **THEN** the chip SHALL render the emoji visibly
- **AND** the chip layout SHALL remain stable

### Requirement: Deterministic chip ordering
The system SHALL provide a deterministic ordering for displayed metadata chips so the same note renders in the same order across refreshes.

#### Scenario: Multiple displayed properties
- **WHEN** a note has more than one displayed property value
- **THEN** the chips SHALL be ordered predictably
- **AND** the order SHALL not vary between re-renders

### Requirement: Sort notes by displayed metadata
The system SHALL support ordering notes by presence and value of displayed metadata when sorting is enabled.

#### Scenario: Notes have different property values
- **WHEN** sorting is enabled for notes in the chronology list
- **THEN** notes with displayed metadata SHALL be ordered consistently by the configured sort rule
- **AND** notes without displayed metadata SHALL be grouped separately or placed after notes with metadata
