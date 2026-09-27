## ADDED Requirements

### Requirement: Active days creation range configuration
系统 SHALL 提供一个设置项 `activeDaysCreatedRange`（字符串类型），允许用户指定以“最近天数”表示的笔记创建时间筛选窗口。

#### Scenario: Parse single number expression
- **WHEN** 用户在设置中输入单个非负整数（例如 `"30"`）
- **THEN** 系统将其解析为最近 `0` 天到 `30` 天（即等价于 `"0-30"`）

#### Scenario: Parse range expression with various delimiters
- **WHEN** 用户输入范围表达式（例如 `"7-30"`、`"7~30"`、`"7..30"`）
- **THEN** 系统解析出较小值为 MinDays（7），较大值为 MaxDays（30）

#### Scenario: Range inverted auto-correction
- **WHEN** 用户输入倒置的范围（例如 `"30-7"`）
- **THEN** 系统自动纠正为 MinDays=7, MaxDays=30

#### Scenario: Empty expression means no filter
- **WHEN** 设置值为空字符串、纯空白或无效非数字内容
- **THEN** 系统判定为不限制创建时间范围，对全库所有笔记生效

### Requirement: Note creation date resolution
系统在判断笔记创建日期时，SHALL 优先遵循插件已有的 Frontmatter 创建时间解析逻辑，解析失败时 fallback 到文件系统创建时间。

#### Scenario: Note has valid creation frontmatter
- **WHEN** 笔记的 Frontmatter 包含 `creationDateAttribute` 配置的属性且值有效
- **THEN** 系统使用该属性解析出的 Moment 日期作为笔记创建时间

#### Scenario: Note lacks creation frontmatter or it is invalid
- **WHEN** 笔记的 Frontmatter 中未定义该属性，或属性内容无法解析为有效日期
- **THEN** 系统使用 `file.stat.ctime` 对应的 Moment 日期作为笔记创建时间

### Requirement: Filter active days calculation and frontmatter synchronization
在实时修改（`on('modify')`）与全库同步（`updateAllNotesActiveDaysProperty`）写入变动天数属性时，系统 SHALL 仅对创建时间在指定范围内的笔记进行统计和写入。

#### Scenario: Note created within range
- **WHEN** 笔记创建日期落在 `[Today - MaxDays, Today - MinDays]` 闭区间内
- **THEN** 系统计算其变动天数并将结果写入该笔记的 Frontmatter 属性中

#### Scenario: Note created outside range
- **WHEN** 笔记创建日期早于 `Today - MaxDays` 或晚于 `Today - MinDays`
- **THEN** 系统完全跳过该笔记，不进行变动天数计算，不修改笔记文件，保持原有 Frontmatter 内容不变
