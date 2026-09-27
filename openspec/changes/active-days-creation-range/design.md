## Context

Obsidian Chronology 插件具有按最近指定天数窗口（`activeDaysWindowDays`）统计笔记变动天数并将数值写入 Frontmatter 的功能。用户希望在知识库管理中只对处于特定创建周期的笔记（例如最近 0~30 天创建的新笔记，或者 7~30 天内创建的笔记）统计并同步该变动天数，而老笔记或超出区间的笔记不予处理。

## Goals / Non-Goals

**Goals:**
- 提供 `activeDaysCreatedRange` 设置项，支持单个数值（如 `30`）或区间表达式（如 `0-30`、`7~30`、`0..30`）。
- 实现统一的天数区间解析器 `parseDaysRange(expr: string): { minDays: number; maxDays: number } | null`。
- 实现与现有插件保持一致的笔记创建时间提取工具函数 `getNoteCreationDate(app: App, file: TFile, creationDateProp?: string): moment.Moment`。
- 在 `on('modify')` 事件监听与全库扫描命令 `updateAllNotesActiveDaysProperty` 中接入创建时间过滤检查。
- 不符合范围的笔记直接跳过，不写入、不覆盖、保持原样。

**Non-Goals:**
- 不清除或删除超出范围笔记原有的 `active_days` 属性。
- 不影响日历视图的热度计算和其他时间线展示。
- 不修改底层变动历史存储（`noteActivityHistory`）的记录行为。

## Decisions

### 1. 表达式语法与容错设计
- 支持的分隔符包含 `-`、`~`、`..`、空格，例如正则匹配 `/^(\d+)(?:\s*(?:-|~|\.\.|\s)\s*(\d+))?$/`。
- 若只输入 1 个数字 `N`，视为 `minDays = 0, maxDays = N`。
- 若用户输入 `30-7`，执行 `Math.min(a, b)` 与 `Math.max(a, b)` 自动校准，防止顺序颠倒导致的逻辑异常。
- 解析失败或留空返回 `null`，表示无过滤限制。

### 2. 笔记创建时间的日期判定
- 判定区间：
  - 起始边界：`moment().startOf('day').subtract(maxDays, 'days')`
  - 结束边界：`moment().endOf('day').subtract(minDays, 'days')`
- 比较：`cDate.isSameOrAfter(startOfRange) && cDate.isSameOrBefore(endOfRange)`（以 day 为粒度或精准时间戳）。

### 3. 处理流位置与性能开销
- 在 `main.ts` 中的 `on('modify')` 与 `updateAllNotesActiveDaysProperty` 中：
  - 优先通过 `metadataCache.getFileCache(file)` 获取缓存的 Frontmatter，无须重复读取物理磁盘文件，性能开销极低。
  - 创建时间不满足区间的笔记直接 `continue` 或 `return`，完全避免产生文件写入 I/O。

## Risks / Trade-offs

- [Risk] 用户可能输入非法字符或负数。  
  → Mitigation: 正则严格匹配非负整数，任何无法解析的非法格式均安全降级为“不限制”。
- [Risk] Obsidian 跨设备同步可能导致 `file.stat.ctime` 变动。  
  → Mitigation: 优先尊重用户配置的 `creationDateAttribute` Frontmatter 属性，与插件既有逻辑一致。
