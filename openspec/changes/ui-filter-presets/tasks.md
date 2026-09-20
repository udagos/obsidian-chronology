## 1. Data Model and Settings

- [x] 1.1 Define `FilterPreset` interface in `src/noteFilterSettings.ts` (or `src/main.ts`)
- [x] 1.2 Update `ChronologyPluginSettings` in `src/main.ts` to include `presets: FilterPreset[]` and `activePresetId?: string | null`
- [x] 1.3 Update `loadSettings()` and default settings in `src/main.ts` to validate and normalize presets

## 2. Modal Prompt for Preset Naming

- [x] 2.1 Implement `PresetPromptModal` using Obsidian `Modal` for name input (supporting create and rename)
- [x] 2.2 Add validation for non-empty names and handle submit / cancel callbacks

## 3. Preset Trigger and Menu Integration in Sidebar

- [x] 3.1 Add preset trigger button `[ 🔖 预设 ▼ ]` to the second row of the filter bar in `src/Views/CalendarContainer.tsx`
- [x] 3.2 Implement dirty state detection comparing current filter/sort state against the active preset
- [x] 3.3 Implement Obsidian native `Menu` on preset button click with load, save as new, update, rename, and delete actions
- [x] 3.4 Wire up load preset action to update React states (`dateMode`, `filterKind`, `filterQuery`, `filterInvert`, `sortByTime`, `sortDesc`) and persist active preset ID
- [x] 3.5 Wire up overwrite update, rename, and delete actions with settings persistence

## 4. UI Styling and Visual Polish

- [x] 4.1 Add CSS rules in `styles.css` for the preset trigger button (`.chronology-filter-preset-btn`) with text truncation, hover effects, and active/dirty styling
- [x] 4.2 Verify layout responsiveness in narrow sidebar widths (ensuring input field flexes cleanly without line breaks)

## 5. Verification and Testing

- [x] 5.1 Run build / type checks (`npm run build` or `npm run dev`)
- [x] 5.2 Verify preset creation, loading, updating, renaming, and deleting workflows
