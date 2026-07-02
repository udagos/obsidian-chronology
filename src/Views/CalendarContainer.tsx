
import { PaneType, TFile } from "obsidian";
import * as React from "react";
import { useCallback } from "react";
import { CalendarItem, CalendarItemType } from "src/CalendarType";
import { normalizeFilterKind, normalizeFilterQuery } from "src/noteFilterSettings";
import type { NoteFilterKind } from "src/noteFilterSettings";
import { getChronologySettings, saveChronologySettings } from "src/main";
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

    const noteFilter = React.useMemo(() => ({
        kind: filterKind,
        query: normalizeFilterQuery(filterQuery),
        invert: filterInvert
    }), [filterKind, filterQuery, filterInvert]);
    
    const notes = timeIndex.getNotesForCalendarItem(current, dateMode, noteFilter);

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

    const lockFilter = useCallback(async () => {
        settings.dateDisplayMode = dateMode;
        settings.lockedNoteFilter = noteFilter;
        await saveChronologySettings();
    }, [dateMode, noteFilter, settings]);

	return (
		<div className="chronology-container">
			<Calendar current={current} onChange={handleChange}  />
            <div className="chronology-filterbar">
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
                <button className="chronology-filter-lock" type="button" onClick={lockFilter} title="锁定当前筛选为默认">锁定</button>
            </div>

            {useList ?
            <NotesList calItem={current} items={notes} onOpen={handleOpen} />
            :
            <TimeLine calItem={current} items={notes} onOpen={handleOpen} />
        }
            

		</div>
	)
}
