## 1. Settings and Data Model

- [x] 1.1 In `src/main.ts`, update `ChronologySettings` interface and `DEFAULT_SETTINGS` to add `activeDaysCreatedRange: string` (default: `""`)
- [x] 1.2 In `src/ChronologySettingTab.ts`, add text input setting for `activeDaysCreatedRange` with description and placeholder

## 2. Utility Functions

- [x] 2.1 Implement `parseDaysRange(expr: string): { minDays: number; maxDays: number } | null` supporting single number and range delimiters
- [x] 2.2 Implement `isNoteCreatedInRange(app: App, file: TFile, rangeExpr: string, creationDateAttr?: string): boolean` reusing existing creation date resolution logic
- [x] 2.3 Add unit tests verifying expression parsing and date range boundary checks

## 3. Integration into Active Days Flow

- [x] 3.1 In `src/main.ts`, update `on('modify')` handler to check `isNoteCreatedInRange` before updating frontmatter
- [x] 3.2 In `src/main.ts`, update `updateAllNotesActiveDaysProperty` to filter files with `isNoteCreatedInRange`
- [x] 3.3 Verify existing notes outside range remain untouched (no frontmatter write / overwrite)

## 4. Verification and Testing

- [x] 4.1 Run unit tests and build check (`npm run build` or test suite)
- [x] 4.2 Validate edge cases (empty expression, inverted range like `30-7`, notes without frontmatter creation date)

