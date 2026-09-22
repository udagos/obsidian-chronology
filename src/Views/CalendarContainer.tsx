
import { App, Menu, Notice, PaneType, TFile, moment } from "obsidian";
import * as React from "react";
import { useCallback } from "react";
import { CalendarItem, CalendarItemType } from "src/CalendarType";
import { getNextPresetColor, normalizeFilterKind, normalizeFilterQuery } from "src/noteFilterSettings";
import type { FilterPreset, NoteFilterKind } from "src/noteFilterSettings";
import { getChronologyPlugin, getChronologySettings, updateChronologySettings } from "src/main";
import { normalizeDateDisplayMode } from "src/timeIndexSettings";
import type { DateDisplayMode } from "src/timeIndexSettings";
import { Calendar } from "./Calendar";
import { TimeIndexContext } from "./CalendarView";
import { TimeLine } from "./TimeLine"
import NotesList from "./NotesList";
import { PresetDeleteModal, PresetPromptModal } from "./PresetPromptModal";
import type { PresetFormValues } from "./PresetPromptModal";
import { myMoment } from "src/myMoment";
import { updateNoteFrontmatterProperty } from "src/utils";
export interface CalendarContainerProps {
	date: CalendarItem;
    onOpen: (note:TFile, paneType: PaneType | boolean)=>void;
}

const getApp = (): App => {
    return getChronologyPlugin()?.app || (window as any).app;
};

export const CalendarContainer = ({date, onOpen}:CalendarContainerProps) => { 

	const timeIndex = React.useContext(TimeIndexContext);
	const [current, setDate] = React.useState(date);
    const settings = getChronologySettings();
    const [dateMode, setDateMode] = React.useState<DateDisplayMode>(settings.dateDisplayMode);
    const [filterKind, setFilterKind] = React.useState<NoteFilterKind>(settings.lockedNoteFilter.kind);
    const [filterQuery, setFilterQuery] = React.useState(settings.lockedNoteFilter.query.join(", "));
    const [filterInvert, setFilterInvert] = React.useState(settings.lockedNoteFilter.invert);
    const [sortByTime, setSortByTime] = React.useState(settings.sortByTime ?? false);
    const [sortDesc, setSortDesc] = React.useState(settings.sortDesc ?? true);
    const [presets, setPresets] = React.useState<FilterPreset[]>(() => settings.presets ?? []);
    const [activePresetId, setActivePresetId] = React.useState<string | null>(() => settings.activePresetId ?? null);
    const [punchInMode, setPunchInMode] = React.useState(false);
    const [quickRange, setQuickRange] = React.useState("custom");

    const activePreset = React.useMemo(() => {
        if (!activePresetId) return null;
        return presets.find((p) => p.id === activePresetId) || null;
    }, [presets, activePresetId]);

    const isDirty = React.useMemo(() => {
        if (!activePreset) return false;
        return (
            dateMode !== activePreset.dateDisplayMode ||
            filterKind !== activePreset.filterKind ||
            filterQuery !== activePreset.filterQuery ||
            filterInvert !== activePreset.filterInvert ||
            sortByTime !== activePreset.sortByTime ||
            sortDesc !== activePreset.sortDesc
        );
    }, [activePreset, dateMode, filterKind, filterQuery, filterInvert, sortByTime, sortDesc]);

    const presetLabel = React.useMemo(() => {
        if (!activePreset) return "预设";
        return isDirty ? `${activePreset.name}*` : activePreset.name;
    }, [activePreset, isDirty]);

    const noteFilter = React.useMemo(() => ({
        kind: filterKind,
        query: normalizeFilterQuery(filterQuery),
        invert: filterInvert
    }), [filterKind, filterQuery, filterInvert]);
    
    const notes = timeIndex.getNotesForCalendarItem(current, dateMode, noteFilter, sortDesc, sortByTime);

	const handleChange = useCallback(
		(value:CalendarItem, isDelta: boolean) => {
            setQuickRange("custom");
            setDate(current=>{
                if(isDelta){
                    return (new CalendarItem(current.date,CalendarItemType.Range,value.date));
                } else {
                    return (value);
                }
            })
		},
		[setDate],
	)

    const useList = settings.useSimpleList || current.type == CalendarItemType.Month || current.type == CalendarItemType.Year || current.type == CalendarItemType.All || current.type == CalendarItemType.Range || current.type == CalendarItemType.StaleRange;

    const handleOpen = useCallback((note:TFile, paneType: PaneType | boolean)=>{
        onOpen(note, paneType);
    },[onOpen]);

    const handleDateMode = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const newMode = normalizeDateDisplayMode(event.target.value);
        setDateMode(newMode);
        void updateChronologySettings({ dateDisplayMode: newMode });
    }, []);

    const handleFilterKind = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        const newKind = normalizeFilterKind(event.target.value);
        setFilterKind(newKind);
        void updateChronologySettings({
            lockedNoteFilter: {
                kind: newKind,
                query: normalizeFilterQuery(filterQuery),
                invert: filterInvert
            }
        });
    }, [filterQuery, filterInvert]);

    const handleFilterQuery = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = event.target.value;
        setFilterQuery(newQuery);
        void updateChronologySettings({
            lockedNoteFilter: {
                kind: filterKind,
                query: normalizeFilterQuery(newQuery),
                invert: filterInvert
            }
        });
    }, [filterKind, filterInvert]);

    const handleFilterInvert = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const newInvert = event.target.checked;
        setFilterInvert(newInvert);
        void updateChronologySettings({
            lockedNoteFilter: {
                kind: filterKind,
                query: normalizeFilterQuery(filterQuery),
                invert: newInvert
            }
        });
    }, [filterKind, filterQuery]);

    const handleSortByTime = useCallback((timeSorted: boolean) => {
        setSortByTime(timeSorted);
        void updateChronologySettings({ sortByTime: timeSorted });
    }, []);

    const handleToggleSortDir = useCallback(() => {
        setSortDesc((prev) => {
            const next = !prev;
            void updateChronologySettings({ sortDesc: next });
            return next;
        });
    }, []);

    const handleLoadPreset = useCallback((preset: FilterPreset) => {
        setDateMode(preset.dateDisplayMode);
        setFilterKind(preset.filterKind);
        setFilterQuery(preset.filterQuery);
        setFilterInvert(preset.filterInvert);
        setSortByTime(preset.sortByTime);
        setSortDesc(preset.sortDesc);
        setActivePresetId(preset.id);
        void updateChronologySettings({
            dateDisplayMode: preset.dateDisplayMode,
            lockedNoteFilter: {
                kind: preset.filterKind,
                query: normalizeFilterQuery(preset.filterQuery),
                invert: preset.filterInvert
            },
            sortByTime: preset.sortByTime,
            sortDesc: preset.sortDesc,
            activePresetId: preset.id
        });
        new Notice(`已加载预设: ${preset.name}`);
    }, []);

    const handleSaveNewPreset = useCallback(() => {
        const app = getApp();
        const defaultColor = getNextPresetColor(presets);
        new PresetPromptModal(app, "保存为新预设", { name: "", color: defaultColor }, (values: PresetFormValues) => {
            const newPreset: FilterPreset = {
                id: String(Date.now()),
                name: values.name,
                dateDisplayMode: dateMode,
                filterKind,
                filterQuery,
                filterInvert,
                sortByTime,
                sortDesc,
                color: values.color || defaultColor,
                checkIns: [],
                missingPropertyToTodo: values.missingPropertyToTodo,
                todoPropertyName: values.todoPropertyName
            };
            setPresets((prev) => {
                const next = [...prev, newPreset];
                void updateChronologySettings({
                    presets: next,
                    activePresetId: newPreset.id
                });
                return next;
            });
            setActivePresetId(newPreset.id);
            new Notice(`已保存新预设: ${values.name}`);
        }).open();
    }, [presets, dateMode, filterKind, filterQuery, filterInvert, sortByTime, sortDesc]);

    const handleUpdatePreset = useCallback((preset: FilterPreset) => {
        const updated: FilterPreset = {
            ...preset,
            dateDisplayMode: dateMode,
            filterKind,
            filterQuery,
            filterInvert,
            sortByTime,
            sortDesc
        };
        setPresets((prev) => {
            const next = prev.map((p) => (p.id === preset.id ? updated : p));
            void updateChronologySettings({
                presets: next
            });
            return next;
        });
        new Notice(`已更新预设: ${preset.name}`);
    }, [dateMode, filterKind, filterQuery, filterInvert, sortByTime, sortDesc]);

    const handleEditPresetConfig = useCallback((preset: FilterPreset) => {
        const app = getApp();
        new PresetPromptModal(
            app,
            `配置预设: ${preset.name}`,
            {
                name: preset.name,
                color: preset.color,
                missingPropertyToTodo: preset.missingPropertyToTodo,
                todoPropertyName: preset.todoPropertyName
            },
            (values: PresetFormValues) => {
                const updated: FilterPreset = {
                    ...preset,
                    name: values.name,
                    color: values.color || preset.color,
                    missingPropertyToTodo: values.missingPropertyToTodo,
                    todoPropertyName: values.todoPropertyName
                };
                setPresets((prev) => {
                    const next = prev.map((p) => (p.id === preset.id ? updated : p));
                    void updateChronologySettings({
                        presets: next
                    });
                    return next;
                });
                new Notice(`已更新预设 "${values.name}" 的配置`);
            }
        ).open();
    }, []);

    const handleRenamePreset = useCallback((preset: FilterPreset) => {
        const app = getApp();
        new PresetPromptModal(app, "重命名预设", preset.name, (values: PresetFormValues) => {
            const updated: FilterPreset = {
                ...preset,
                name: values.name
            };
            setPresets((prev) => {
                const next = prev.map((p) => (p.id === preset.id ? updated : p));
                void updateChronologySettings({
                    presets: next
                });
                return next;
            });
            new Notice(`已重命名预设为: ${values.name}`);
        }).open();
    }, []);

    const handleDeletePreset = useCallback((id: string, name: string) => {
        setPresets((prev) => {
            const next = prev.filter((p) => p.id !== id);
            void updateChronologySettings({
                presets: next,
                activePresetId: activePresetId === id ? null : activePresetId
            });
            return next;
        });
        setActivePresetId((prevActive) => (prevActive === id ? null : prevActive));
        new Notice(`已删除预设: ${name}`);
    }, [activePresetId]);

    const handleClearActivePreset = useCallback(() => {
        setActivePresetId(null);
        void updateChronologySettings({ activePresetId: null });
        new Notice("已退出预设模式");
    }, []);

    const handleTogglePunchInDate = useCallback(async (dateStr: string) => {
        if (!activePreset) {
            new Notice("请先选择一个预设进行打卡");
            return;
        }
        const app = getApp();
        const checkIns = activePreset.checkIns || [];
        const isChecked = checkIns.includes(dateStr);

        let nextCheckIns: string[];
        if (isChecked) {
            nextCheckIns = checkIns.filter((d) => d !== dateStr);
            new Notice(`已取消 "${activePreset.name}" 在 ${dateStr} 的打卡`);
        } else {
            nextCheckIns = [...checkIns, dateStr].sort();
            new Notice(`已完成 "${activePreset.name}" 在 ${dateStr} 的打卡`);

            // Check if automation is needed
            if (activePreset.missingPropertyToTodo) {
                const sortedPrior = checkIns.filter((d) => d < dateStr).sort();
                const lastCheckIn = sortedPrior.length > 0 ? sortedPrior[sortedPrior.length - 1] : null;

                const rangeItem = lastCheckIn
                    ? new CalendarItem(moment(lastCheckIn), CalendarItemType.Range, moment(dateStr))
                    : new CalendarItem(moment(dateStr), CalendarItemType.Day);

                const targetNotes = timeIndex.getNotesForCalendarItem(
                    rangeItem,
                    activePreset.dateDisplayMode,
                    {
                        kind: activePreset.filterKind,
                        query: normalizeFilterQuery(activePreset.filterQuery),
                        invert: activePreset.filterInvert
                    }
                );

                let taggedCount = 0;
                const propKey = activePreset.missingPropertyToTodo;
                const todoKey = activePreset.todoPropertyName || "todo";

                for (const item of targetNotes) {
                    const cache = app.metadataCache.getFileCache(item.note);
                    const fm = cache?.frontmatter;
                    const hasProp = Boolean(
                        fm &&
                        Object.prototype.hasOwnProperty.call(fm, propKey) &&
                        fm[propKey] !== null &&
                        fm[propKey] !== undefined &&
                        fm[propKey] !== ""
                    );
                    if (!hasProp) {
                        try {
                            await updateNoteFrontmatterProperty(app, item.note, todoKey, dateStr);
                            taggedCount++;
                        } catch (err) {
                            console.error(`Failed to update frontmatter for ${item.note.path}`, err);
                        }
                    }
                }

                if (taggedCount > 0) {
                    new Notice(`已为 ${taggedCount} 篇缺少 "${propKey}" 属性的笔记添加 ${todoKey}: ${dateStr}`);
                }
            }
        }

        const updatedPreset: FilterPreset = {
            ...activePreset,
            checkIns: nextCheckIns
        };

        setPresets((prev) => {
            const next = prev.map((p) => (p.id === activePreset.id ? updatedPreset : p));
            void updateChronologySettings({
                presets: next
            });
            return next;
        });
    }, [activePreset, timeIndex]);

    const handleQuickRangeChange = useCallback((rangeKey: string) => {
        setQuickRange(rangeKey);
        const today = myMoment();
        switch (rangeKey) {
            case "1w":
                setDate(new CalendarItem(today.clone().subtract(6, "days"), CalendarItemType.Range, today.clone()));
                break;
            case "2w":
                setDate(new CalendarItem(today.clone().subtract(13, "days"), CalendarItemType.Range, today.clone()));
                break;
            case "3w":
                setDate(new CalendarItem(today.clone().subtract(20, "days"), CalendarItemType.Range, today.clone()));
                break;
            case "1m":
                setDate(new CalendarItem(today.clone().subtract(29, "days"), CalendarItemType.Range, today.clone()));
                break;
            case "1w-stale":
                setDate(new CalendarItem(today.clone().subtract(6, "days"), CalendarItemType.StaleRange, today.clone(), true, 7));
                break;
            case "1m-stale":
                setDate(new CalendarItem(today.clone().subtract(29, "days"), CalendarItemType.StaleRange, today.clone(), true, 30));
                break;
            case "lastCheckIn":
                if (activePreset && activePreset.checkIns && activePreset.checkIns.length > 0) {
                    const lastDate = activePreset.checkIns[activePreset.checkIns.length - 1];
                    setDate(new CalendarItem(moment(lastDate), CalendarItemType.Range, today.clone()));
                } else {
                    new Notice("当前预设暂无打卡记录");
                    setQuickRange("custom");
                }
                break;
            case "all":
                setDate(new CalendarItem(today.clone(), CalendarItemType.All));
                break;
            case "custom":
            default:
                break;
        }
    }, [activePreset]);

    const checkInStats = React.useMemo(() => {
        if (!activePreset || !activePreset.checkIns || activePreset.checkIns.length === 0) {
            return null;
        }
        const lastCheckInStr = activePreset.checkIns[activePreset.checkIns.length - 1];
        const lastCheckInDate = moment(lastCheckInStr);
        const today = myMoment();
        const daysDiff = today.diff(lastCheckInDate, "days");

        const rangeItem = new CalendarItem(lastCheckInDate, CalendarItemType.Range, today);
        const notesCount = timeIndex.getNotesForCalendarItem(
            rangeItem,
            activePreset.dateDisplayMode,
            {
                kind: activePreset.filterKind,
                query: normalizeFilterQuery(activePreset.filterQuery),
                invert: activePreset.filterInvert
            }
        ).length;

        return {
            lastCheckInStr,
            daysDiff,
            notesCount
        };
    }, [activePreset, timeIndex]);

    const isTodayCheckedIn = React.useMemo(() => {
        if (!activePreset || !activePreset.checkIns) return false;
        const todayStr = myMoment().format("YYYY-MM-DD");
        return activePreset.checkIns.includes(todayStr);
    }, [activePreset]);

    const handleTodayPunchIn = useCallback(() => {
        if (!activePreset) {
            new Notice("请先选择一个预设进行打卡");
            return;
        }
        const todayStr = myMoment().format("YYYY-MM-DD");
        void handleTogglePunchInDate(todayStr);
    }, [activePreset, handleTogglePunchInDate]);

    const handleTogglePunchInMode = useCallback(() => {
        if (!punchInMode && !activePreset) {
            new Notice("请先选择一个预设再开启打卡模式");
            return;
        }
        setPunchInMode((prev) => {
            const next = !prev;
            new Notice(next ? "已开启打卡模式（点击日历格子直接打卡）" : "已关闭打卡模式");
            return next;
        });
    }, [punchInMode, activePreset]);

    const handlePresetMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        const app = getApp();
        const menu = new Menu();

        if (presets.length > 0) {
            presets.forEach((preset) => {
                const isActive = preset.id === activePresetId;
                menu.addItem((item) => {
                    item.setTitle(preset.name)
                        .setIcon(isActive ? "check" : "bookmark")
                        .setChecked(isActive)
                        .onClick(() => handleLoadPreset(preset));
                });
            });
            menu.addSeparator();
        }

        menu.addItem((item) => {
            item.setTitle("保存当前为新预设...")
                .setIcon("save")
                .onClick(() => handleSaveNewPreset());
        });

        if (activePreset) {
            if (isDirty) {
                menu.addItem((item) => {
                    item.setTitle(`重置回 "${activePreset.name}"`)
                        .setIcon("undo")
                        .onClick(() => handleLoadPreset(activePreset));
                });
            }
            menu.addItem((item) => {
                item.setTitle(`覆盖更新到 "${activePreset.name}"`)
                    .setIcon("refresh-cw")
                    .onClick(() => handleUpdatePreset(activePreset));
            });
            menu.addItem((item) => {
                item.setTitle(`配置/修改 "${activePreset.name}"...`)
                    .setIcon("sliders")
                    .onClick(() => handleEditPresetConfig(activePreset));
            });
            menu.addItem((item) => {
                item.setTitle(`重命名 "${activePreset.name}"...`)
                    .setIcon("pencil")
                    .onClick(() => handleRenamePreset(activePreset));
            });
            menu.addItem((item) => {
                item.setTitle(`删除 "${activePreset.name}"`)
                    .setIcon("trash")
                    .onClick(() => handleDeletePreset(activePreset.id, activePreset.name));
            });
            menu.addItem((item) => {
                item.setTitle("退出当前预设")
                    .setIcon("x")
                    .onClick(() => handleClearActivePreset());
            });
        } else if (presets.length > 0) {
            menu.addItem((item) => {
                item.setTitle("删除预设...")
                    .setIcon("trash")
                    .onClick(() => {
                        new PresetDeleteModal(app, presets, (id, name) => {
                            handleDeletePreset(id, name);
                        }).open();
                    });
            });
        }

        menu.showAtMouseEvent(event.nativeEvent);
    }, [presets, activePreset, activePresetId, isDirty, handleLoadPreset, handleSaveNewPreset, handleUpdatePreset, handleEditPresetConfig, handleRenamePreset, handleDeletePreset, handleClearActivePreset]);

	return (
		<div className="chronology-container">
			<Calendar
                current={current}
                onChange={handleChange}
                presets={presets}
                activePreset={activePreset}
                punchInMode={punchInMode}
                onTogglePunchInDate={handleTogglePunchInDate}
                quickRange={quickRange}
                onQuickRangeChange={handleQuickRangeChange}
            />
            <div className="chronology-filterbar">
                {activePreset && (
                    <div className="chronology-filter-row chronology-filter-row-checkin">
                        <div className="chronology-preset-checkin-info" title={checkInStats ? `上次打卡: ${checkInStats.lastCheckInStr} (${checkInStats.daysDiff === 0 ? "今天" : `${checkInStats.daysDiff}天前`}，产生 ${checkInStats.notesCount} 篇笔记)` : "暂无打卡记录"}>
                            <span
                                className="chronology-preset-color-badge"
                                style={{ backgroundColor: activePreset.color }}
                                title={`预设颜色: ${activePreset.color}`}
                            />
                            <span className="chronology-preset-stats-text">
                                {checkInStats ? (
                                    <>上次: {checkInStats.lastCheckInStr} ({checkInStats.daysDiff === 0 ? "今天" : `${checkInStats.daysDiff}天前`} · {checkInStats.notesCount}篇)</>
                                ) : (
                                    <>暂无打卡</>
                                )}
                            </span>
                        </div>
                        <div className="chronology-preset-checkin-actions">
                            <button
                                type="button"
                                className={`chronology-checkin-btn${isTodayCheckedIn ? " chronology-checkin-btn-checked" : ""}`}
                                onClick={handleTodayPunchIn}
                                title={isTodayCheckedIn ? "今日已打卡（点击取消）" : "在今日为当前预设打卡"}
                            >
                                {isTodayCheckedIn ? "✓已打卡" : "今日打卡"}
                            </button>
                            <button
                                type="button"
                                className={`chronology-punch-in-mode-btn${punchInMode ? " chronology-punch-in-mode-active" : ""}`}
                                onClick={handleTogglePunchInMode}
                                title={punchInMode ? "打卡模式开启中：点击日历格子直接打卡" : "开启打卡模式（点击日历格子打卡）"}
                            >
                                {punchInMode ? "📍打卡中" : "📍点选"}
                            </button>
                        </div>
                    </div>
                )}
                <div className="chronology-filter-row">
                    <select className="chronology-filter-control" value={dateMode} onChange={handleDateMode} title="Date display mode">
                        <option value="both">新建+修改</option>
                        <option value="created">只看新建</option>
                        <option value="modified">只看修改</option>
                    </select>
                    <select className="chronology-filter-control" value={filterKind} onChange={handleFilterKind} title="筛选模式">
                        <option value="all">全部 (混合)</option>
                        <option value="property">属性</option>
                        <option value="tag">标签</option>
                        <option value="folder">文件夹</option>
                    </select>
                    <button
                        className={`chronology-sort-btn${sortByTime ? "" : " chronology-sort-btn-active"}`}
                        onClick={() => handleSortByTime(false)}
                        title="按属性排序"
                    >属性</button>
                    <button
                        className={`chronology-sort-btn${sortByTime ? " chronology-sort-btn-active" : ""}`}
                        onClick={() => handleSortByTime(true)}
                        title="按时间排序"
                    >时间</button>
                    <button
                        className="chronology-sort-btn chronology-sort-dir-btn"
                        onClick={handleToggleSortDir}
                        title={sortDesc ? "当前：逆序（新→旧）" : "当前：正序（旧→新）"}
                    >{sortDesc ? "↓" : "↑"}</button>
                </div>
                <div className="chronology-filter-row chronology-filter-row-query">
                    <button
                        type="button"
                        className={`chronology-filter-preset-btn${activePreset ? " chronology-filter-preset-active" : ""}${isDirty ? " chronology-filter-preset-dirty" : ""}`}
                        onClick={handlePresetMenu}
                        title={activePreset ? `当前预设：${activePreset.name}${isDirty ? "（已修改）" : ""}` : "预设配置"}
                    >
                        {activePreset ? (
                            <span
                                className="chronology-filter-preset-color-dot"
                                style={{ backgroundColor: activePreset.color }}
                            />
                        ) : (
                            <span className="chronology-filter-preset-icon">🔖</span>
                        )}
                        <span className="chronology-filter-preset-name">{presetLabel}</span>
                        <span className="chronology-filter-preset-arrow">▼</span>
                    </button>
                    <input
                        className="chronology-filter-query"
                        value={filterQuery}
                        onChange={handleFilterQuery}
                        placeholder="属性(默认)，#标签，@文件夹，&且，,或"
                        title="混合筛选：直接写属性，#开头为标签（如 #1），@开头为文件夹（如 @1）。逗号(,)为或，&为且，支持括号()分组，~代表反选"
                    />
                    <label className="chronology-filter-check" title="反向筛选">
                        <input type="checkbox" checked={filterInvert} onChange={handleFilterInvert} />
                        反向
                    </label>
                </div>
            </div>

            {useList ?
            <NotesList calItem={current} items={notes} onOpen={handleOpen} />
            :
            <TimeLine calItem={current} items={notes} onOpen={handleOpen} />
        }
            

		</div>
	)
}
