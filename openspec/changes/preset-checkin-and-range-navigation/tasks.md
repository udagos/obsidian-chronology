## 1. Data Model & Settings Foundation

- [x] 1.1 Update `CalendarType.ts` to add `CalendarItemType.All = 5` and handle range resolution
- [x] 1.2 Update `TimeIndex.ts` to support `CalendarItemType.All` (bypass date time-range check while retaining folder and filter exclusions)
- [x] 1.3 Extend `FilterPreset` interface in `noteFilterSettings.ts` with `color`, `checkIns: string[]`, `missingPropertyToTodo?: string`, and `todoPropertyName?: string`
- [x] 1.4 Add palette generator / color assignment utility in `noteFilterSettings.ts` and ensure backward-compatible normalization for existing presets

## 2. Calendar Header & Range Navigation

- [x] 2.1 Enable `selectYear` in `src/Views/Calendar.tsx` to allow selecting and highlighting the current year (`CalendarItemType.Year`)
- [x] 2.2 Add quick range dropdown selector in `Calendar.tsx` header (options: 自选日期, 最近一周, 最近二周, 最近三周, 最近一月, 到当前预设上次打卡, 全部历史)
- [x] 2.3 Wire dropdown change handler to calculate corresponding `CalendarItemType.Range` or `CalendarItemType.All`
- [x] 2.4 Automatically reset quick range dropdown to "自选日期" when user clicks individual day/week cells

## 3. Preset Check-in & Habit Tracking

- [x] 3.1 Implement "今日打卡" handler in `CalendarContainer.tsx` to record today's date in the active preset's `checkIns`
- [x] 3.2 Add "打卡模式" toggle state in `CalendarContainer.tsx` and propagate click-to-punch-in handler to `Calendar.tsx`
- [x] 3.3 Render colored check-in dots on calendar date cells in `Calendar.tsx` for all presets that checked in on each date
- [x] 3.4 Implement statistics calculation (days elapsed and matching notes count since active preset's last check-in) and render in preset info bar

## 4. Note Frontmatter Todo Automation

- [x] 4.1 Implement frontmatter scanning and injection logic using `app.fileManager.processFrontMatter` for notes in `[lastCheckIn, checkInDate]`
- [x] 4.2 Validate missing property condition (if note lacks `missingPropertyToTodo`, set `todo: checkInDate`, overwriting any prior todo)
- [x] 4.3 Trigger automation during check-in with notification summarizing tagged notes count
- [x] 4.4 Update `PresetPromptModal.ts` to allow configuring the missing property rule and custom color when creating/editing presets

## 5. UI Polish & Styling

- [x] 5.1 Add CSS rules in `styles.css` for check-in dots, quick range dropdown, punch-in mode active button, and check-in summary badge
- [x] 5.2 Ensure responsive alignment and readability in narrow Obsidian sidebars

## 6. Verification & Testing

- [x] 6.1 Verify year, month, and "全部历史" navigation and note listing
- [x] 6.2 Verify quick range dropdown options (1w, 2w, 3w, 1m, to last check-in)
- [x] 6.3 Verify button check-in and calendar cell punch-in mode across multiple presets with distinct colors
- [x] 6.4 Verify frontmatter `todo` attribute injection and overwrite behavior on untagged notes
