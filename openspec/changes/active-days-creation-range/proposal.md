## Why

当前插件提供了变动天数统计窗口设置（`activeDaysWindowDays`），用于统计最近指定天数内有属性变动的笔记活跃天数，并可同步写入笔记 Frontmatter（如 `active_days`）。但在知识管理和渐进式总结场景中，用户往往希望聚焦在处于特定生命周期阶段的笔记（例如仅统计最近 0~30 天内新建的孵化期笔记，或 7~90 天内创建的沉淀期笔记），而非无差别更新全库所有历史笔记。因此，需要增加按笔记创建时间范围进行过滤的配置项。

## What Changes

- 新增设置项 `activeDaysCreatedRange`（支持如 `0-30`、`7~30`、`0..30` 或单个数字 `30`，留空表示不限制）。
- 新增对输入表达式的范围解析逻辑：
  - 单个数字 `N` 解析为最近 `0` 到 `N` 天；
  - 范围 `Min-Max` 自动容错（若输入 `30-7` 自动取较小值为 Min，较大值为 Max）。
- 笔记创建时间（ctime）解析统一复用插件现有规范：
  - 优先读取用户配置的 Frontmatter 创建时间字段（`creationDateAttribute`）；
  - 若未配置或解析无效，则 fallback 到文件系统创建时间（`file.stat.ctime`）。
- 变动天数统计与写入逻辑过滤：
  - 在实时监听笔记修改（`on('modify')`）与全库批量更新（`updateAllNotesActiveDaysProperty`）时，检查笔记创建日期是否在 `[Today - Max, Today - Min]` 闭区间内。
  - 对于不在范围内的笔记：完全不处理、不计算、不写入；若笔记已有该属性则保持原样（跳过处理）。
- 设置面板（`ChronologySettingTab`）增加对应设置项的输入框与说明文本。

## Capabilities

### New Capabilities
- `active-days-creation-filter`: 支持通过灵活的天数范围表达式配置笔记创建时间过滤窗口，在变动天数写入与批量同步时仅处理创建时间在窗口内的笔记，不符合条件的笔记保持原样不处理。

### Modified Capabilities
<!-- 本次无全局 specs 目录变更，采用独立的新增 capability spec -->

## Impact

- `src/main.ts`：更新配置接口 `ChronologySettings`，并在 `on('modify')` 与 `updateAllNotesActiveDaysProperty` 中加入创建时间范围判断。
- `src/ChronologySettingTab.ts`：在变动天数设置区域添加创建时间范围的 Setting 项。
- 向后兼容性：该配置默认为空字符串 `""`，保持现有对全库所有笔记计算变动天数的默认行为完全一致。
