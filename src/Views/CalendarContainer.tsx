
import { PaneType, TFile } from "obsidian";
import * as React from "react";
import { useCallback } from "react";
import { CalendarItem, CalendarItemType } from "src/CalendarType";
import { normalizeFilterKind, normalizeFilterQuery } from "src/noteFilterSettings";
import type { NoteFilterKind } from "src/noteFilterSettings";
import { getChronologySettings } from "src/main";
import { normalizeDateDisplayMode } from "src/timeIndexSettings";
import type { DateDisplayMode } from "src/timeIndexSettings";
import { Calendar } from "./Calendar";
import { TimeIndexContext } from "./CalendarView";
import { TimeLine } from "./TimeLine"
import NotesList from "./NotesList";
export interface CalendarContainerProps {
	date: CalendarItem;
    onOpen: (note:TFile, paneType: PaneType | boolean)=>void;
}



export const CalendarContainer = ({date, onOpen}:CalendarContainerProps) => { 

	const timeIndex = React.useContext(TimeIndexContext);
	const [current, setDate] = React.useState(date);
    const settings = getChronologySettings();
    const [dateMode, setDateMode] = React.useState<DateDisplayMode>(settings.dateDisplayMode);
    const [filterKind, setFilterKind] = React.useState<NoteFilterKind>(settings.lockedNoteFilter.kind);
    const [filterQuery, setFilterQuery] = React.useState(settings.lockedNoteFilter.query.join(", "));
    const [filterInvert, setFilterInvert] = React.useState(settings.lockedNoteFilter.invert);
    const [sortByTime, setSortByTime] = React.useState(false);
    const [sortDesc, setSortDesc] = React.useState(true);

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
        setDateMode(normalizeDateDisplayMode(event.target.value));
    }, []);

    const handleFilterKind = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        setFilterKind(normalizeFilterKind(event.target.value));
    }, []);

    const handleFilterQuery = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setFilterQuery(event.target.value);
    }, []);

    const handleFilterInvert = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setFilterInvert(event.target.checked);
    }, []);

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
                        onClick={() => setSortByTime(false)}
                        title="按属性排序"
                    >属性</button>
                    <button
                        className={`chronology-sort-btn${sortByTime ? " chronology-sort-btn-active" : ""}`}
                        onClick={() => setSortByTime(true)}
                        title="按时间排序"
                    >时间</button>
                    <button
                        className="chronology-sort-btn chronology-sort-dir-btn"
                        onClick={() => setSortDesc(d => !d)}
                        title={sortDesc ? "当前：逆序（新→旧）" : "当前：正序（旧→新）"}
                    >{sortDesc ? "↓" : "↑"}</button>
                </div>
                <div className="chronology-filter-row chronology-filter-row-query">
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
