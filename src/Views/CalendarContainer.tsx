
import { App, Menu, Notice, PaneType, TFile } from "obsidian";
import * as React from "react";
import { useCallback } from "react";
import { CalendarItem, CalendarItemType } from "src/CalendarType";
import { normalizeFilterKind, normalizeFilterQuery } from "src/noteFilterSettings";
import type { FilterPreset, NoteFilterKind } from "src/noteFilterSettings";
import { getChronologyPlugin, getChronologySettings, updateChronologySettings } from "src/main";
import { normalizeDateDisplayMode } from "src/timeIndexSettings";
import type { DateDisplayMode } from "src/timeIndexSettings";
import { Calendar } from "./Calendar";
import { TimeIndexContext } from "./CalendarView";
import { TimeLine } from "./TimeLine"
import NotesList from "./NotesList";
import { PresetDeleteModal, PresetPromptModal } from "./PresetPromptModal";
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

    const useList = settings.useSimpleList || current.type == CalendarItemType.Month || current.type == CalendarItemType.Range;

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
        new PresetPromptModal(app, "保存为新预设", "", (name) => {
            const newPreset: FilterPreset = {
                id: String(Date.now()),
                name,
                dateDisplayMode: dateMode,
                filterKind,
                filterQuery,
                filterInvert,
                sortByTime,
                sortDesc
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
            new Notice(`已保存新预设: ${name}`);
        }).open();
    }, [dateMode, filterKind, filterQuery, filterInvert, sortByTime, sortDesc]);

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

    const handleRenamePreset = useCallback((preset: FilterPreset) => {
        const app = getApp();
        new PresetPromptModal(app, "重命名预设", preset.name, (newName) => {
            const updated: FilterPreset = {
                ...preset,
                name: newName
            };
            setPresets((prev) => {
                const next = prev.map((p) => (p.id === preset.id ? updated : p));
                void updateChronologySettings({
                    presets: next
                });
                return next;
            });
            new Notice(`已重命名预设为: ${newName}`);
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
    }, [presets, activePreset, activePresetId, isDirty, handleLoadPreset, handleSaveNewPreset, handleUpdatePreset, handleRenamePreset, handleDeletePreset, handleClearActivePreset]);

	return (
		<div className="chronology-container">
			<Calendar current={current} onChange={handleChange}  />
            <div className="chronology-filterbar">
                <div className="chronology-filter-row">
                    <select className="chronology-filter-control" value={dateMode} onChange={handleDateMode} title="Date display mode">
                        <option value="both">新建+修改</option>
                        <option value="created">只看新建</option>
                        <option value="modified">只看修改</option>
                    </select>
                    <select className="chronology-filter-control" value={filterKind} onChange={handleFilterKind} title="Filter type">
                        <option value="all">全部</option>
                        <option value="tag">标签</option>
                        <option value="property">属性</option>
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
                        <span className="chronology-filter-preset-icon">🔖</span>
                        <span className="chronology-filter-preset-name">{presetLabel}</span>
                        <span className="chronology-filter-preset-arrow">▼</span>
                    </button>
                    <input
                        className="chronology-filter-query"
                        value={filterQuery}
                        onChange={handleFilterQuery}
                        placeholder="多个用逗号分隔"
                        disabled={filterKind === "all"}
                    />
                    <label className="chronology-filter-check" title="反向筛选">
                        <input type="checkbox" checked={filterInvert} onChange={handleFilterInvert} disabled={filterKind === "all"} />
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
