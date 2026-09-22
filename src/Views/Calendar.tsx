import { moment } from "obsidian";
import * as React from "react";
import { useCallback } from "react";
import { CalendarItem, CalendarItemType } from "src/CalendarType";
import type { FilterPreset } from "src/noteFilterSettings";
import { TimeIndexContext } from "./CalendarView";
import { myMoment } from "src/myMoment";

export interface CalendarViewProps {
    current: CalendarItem;
    onChange: (sel: CalendarItem, isDelta: boolean) => void;
    presets?: FilterPreset[];
    activePreset?: FilterPreset | null;
    punchInMode?: boolean;
    onTogglePunchInDate?: (dateStr: string) => void;
    quickRange?: string;
    onQuickRangeChange?: (rangeKey: string) => void;
}

interface CalendarCellProps {
    value: CalendarItem;
    current: CalendarItem;
    onChange: (value: CalendarItem, delta: boolean) => void;
    punchInMode?: boolean;
    onTogglePunchInDate?: (dateStr: string) => void;
    checkInPresets?: { name: string; color: string }[];
}

const Cell = ({
    value,
    current,
    onChange,
    punchInMode,
    onTogglePunchInDate,
    checkInPresets
}: CalendarCellProps) => {

    const timeIndex = React.useContext(TimeIndexContext);

    const handleChange = useCallback(
        (e: React.MouseEvent) => {
            const isDelta = e.shiftKey;
            // avoid triggering a pointless change. This works also for week numbers
            if (!current.date.isSame(value.date, "day") || current.type !== value.type) {
                onChange(value, isDelta);
            }
        },
        [current, value, onChange],
    );

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            if (punchInMode && value.type === CalendarItemType.Day && onTogglePunchInDate) {
                e.stopPropagation();
                onTogglePunchInDate(value.date.format("YYYY-MM-DD"));
                return;
            }
            handleChange(e);
        },
        [punchInMode, value, onTogglePunchInDate, handleChange]
    );

    const itemDate = value.date;
    const currendDate = current.date;
    const month = currendDate.month();

    if (value.type === CalendarItemType.Week) {
        const classes = ["chronology-calendar-weeknumber"];
        if (current.type !== CalendarItemType.Week || !current.date.isSame(itemDate, "week")) {
            classes.push("chronology-calendar-selectable");
        }
        return <td key={`week-${value}`} className={classes.join(" ")} onClick={handleClick} >{itemDate.week()}</td>;
    } else {
        const classes = ["chronology-calendar-day"];
        if (current.type !== CalendarItemType.Day || !current.date.isSame(itemDate, "day")) {
            classes.push("chronology-calendar-selectable");
        }
        if (punchInMode) {
            classes.push("chronology-punch-in-target");
        }
        classes.push(month === itemDate.month() ? "chronology-current-month" : "chronology-other-month");

        if (itemDate.isSame(myMoment(), "day")) classes.push("chronology-calendar-today");

        if (current.type === CalendarItemType.Day && itemDate.isSame(currendDate, "day")) {
            classes.push("chronology-selected");
        } 
        if (current.type === CalendarItemType.Range && current.isInRange(itemDate)) {
            classes.push("chronology-selected");
        }

        const heatLevel = timeIndex.getHeatForDate(itemDate.format("YYYY-MM-DD"));
        const percentage = Math.max(0, Math.min(Math.ceil(heatLevel * 100), 100));
        const height = `${percentage}%`;

        return (
            <td key={itemDate.dayOfYear()} className={classes.join(" ")} onClick={handleClick}>
                <div className="chronology-calendar-heat-background" style={{ height }}></div>
                <span>{itemDate.date()}</span>
                {checkInPresets && checkInPresets.length > 0 && (
                    <div
                        className="chronology-checkin-dots"
                        title={checkInPresets.map(p => `${p.name} (打卡)`).join(", ")}
                    >
                        {checkInPresets.map((p, idx) => (
                            <span
                                key={idx}
                                className="chronology-checkin-dot"
                                style={{ backgroundColor: p.color }}
                            />
                        ))}
                    </div>
                )}
            </td>
        );
    }
};

const Week = ({
    week,
    current,
    onChange,
    punchInMode,
    onTogglePunchInDate,
    checkInPresetsMap
}: {
    week: number[];
    current: CalendarItem;
    onChange: (value: CalendarItem, isDelta: boolean) => void;
    punchInMode?: boolean;
    onTogglePunchInDate?: (dateStr: string) => void;
    checkInPresetsMap?: Map<string, { name: string; color: string }[]>;
}) => {

    const [year, weekNumber] = week;
    const firstDayOfWeek = myMoment().year(year).startOf("year").week(weekNumber).startOf("week");
    const lastDayOfWeek = firstDayOfWeek.clone().endOf("week");
 
    const weekRange: CalendarItem[] = [new CalendarItem(firstDayOfWeek.clone(), CalendarItemType.Week)];
    for (let i = firstDayOfWeek.clone(); i.isBefore(lastDayOfWeek); i = i.add(1, "days")) {
        weekRange.push(new CalendarItem(i.clone(), CalendarItemType.Day));
    }

    const weekClasses = ["chronology-calendar-week-row"];

    if (current.type === CalendarItemType.Week && current.date.week() === weekNumber) {
        weekClasses.push("chronology-selected");
    }

    return (
        <tr className={weekClasses.join(" ")}>
            {weekRange.map(d => {
                const dateStr = d.date.format("YYYY-MM-DD");
                const checkInPresets = d.type === CalendarItemType.Day ? checkInPresetsMap?.get(dateStr) : undefined;
                return (
                    <Cell
                        key={d.toString()}
                        value={d}
                        current={current}
                        onChange={onChange}
                        punchInMode={punchInMode}
                        onTogglePunchInDate={onTogglePunchInDate}
                        checkInPresets={checkInPresets}
                    />
                );
            })}
        </tr>
    );
};

export const Calendar = ({
    current,
    onChange,
    presets,
    activePreset,
    punchInMode,
    onTogglePunchInDate,
    quickRange,
    onQuickRangeChange
}: CalendarViewProps) => {

    const currentDate = current.date;
    const today = myMoment();
    const isToday = currentDate.isSame(today, "day");
    const firstOfMonth = currentDate.clone().startOf("month");
    const endOfMonth = currentDate.clone().endOf("month");
    const monthName = currentDate.format("M月");
    const yearName = currentDate.format("YYYY");

    const firstDayOGrid = firstOfMonth.clone().startOf("week");
    const startWeek = firstDayOGrid.week();
    const startYear = firstDayOGrid.weekYear();

    const daysOfTheWeek = [""];
    const endofFirstWeek = firstDayOGrid.clone().endOf("week");
    for (let d = firstDayOGrid.clone(); d.isBefore(endofFirstWeek); d = d.add(1, "days")) {
        daysOfTheWeek.push(d.format("dd"));
    }

    let w = [startYear, startWeek]; 
    const d = myMoment().year(w[0]).startOf("year").week(w[1]).startOf("week");
    const monthRange = [];
    while (d.isBefore(endOfMonth)) {
        monthRange.push(w);
        d.add(1, "week");
        w = [d.weekYear(), d.week()];
    }

    const checkInPresetsMap = React.useMemo(() => {
        const map = new Map<string, { name: string; color: string }[]>();
        if (!presets) return map;
        for (const preset of presets) {
            if (!preset.checkIns) continue;
            for (const dateStr of preset.checkIns) {
                const list = map.get(dateStr) || [];
                list.push({ name: preset.name, color: preset.color });
                map.set(dateStr, list);
            }
        }
        return map;
    }, [presets]);

    const hasLastCheckIn = Boolean(activePreset?.checkIns && activePreset.checkIns.length > 0);

    const handleChange = useCallback((value: CalendarItem, isDelta: boolean) => {
        onChange(value, isDelta);
    }, [onChange]);

    const selectToday = useCallback(() => {
        onChange(new CalendarItem(myMoment(), CalendarItemType.Day), false);
    }, [onChange]);

    const selectMonth = useCallback(() => {
        onChange(new CalendarItem(currentDate, CalendarItemType.Month), false);
    }, [currentDate, onChange]);

    const selectYear = useCallback(() => {
        onChange(new CalendarItem(currentDate, CalendarItemType.Year), false);
    }, [currentDate, onChange]);

    const shiftMonth = (diff: number) => useCallback(() => {
        onChange(new CalendarItem(moment(currentDate).startOf("month").add(diff, "month"), CalendarItemType.Month), false);
    }, [diff, currentDate, onChange]);

    const handleQuickRangeChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
        if (onQuickRangeChange) {
            onQuickRangeChange(event.target.value);
        }
    }, [onQuickRangeChange]);

    const monthClasses = ["chronology-calendar-selectable"];
    if (current.type === CalendarItemType.Month) {
        monthClasses.push("chronology-selected");
    }

    const yearClasses = ["chronology-calendar-selectable"];
    if (current.type === CalendarItemType.Year) {
        yearClasses.push("chronology-selected");
    }

    return (
        <div className="chronology-calendar-box">
            <table className="chronology-calendar-grid">
                <thead>
                    <tr className="chronology-calendar-header-row">
                        <th>
                            <div className="chronology-calendar-chevron" onClick={shiftMonth(-1)} >
                                <span className="chevron left"></span>
                            </div>
                        </th>
                        <th colSpan={4} className="chronology-calendar-title-th">
                            <span className={monthClasses.join(" ")} onClick={selectMonth}>
                                {monthName}
                            </span>
                            &nbsp;
                            <span className={yearClasses.join(" ")} onClick={selectYear} >
                                {yearName}
                            </span>
                        </th>
                        <th colSpan={2} className="chronology-calendar-range-th">
                            <select
                                className="chronology-quick-range-select"
                                value={quickRange || "custom"}
                                onChange={handleQuickRangeChange}
                                title="快速选择时间范围"
                            >
                                <option value="custom">自选日期</option>
                                <option value="1w">最近一周</option>
                                <option value="2w">最近二周</option>
                                <option value="3w">最近三周</option>
                                <option value="1m">最近一月</option>
                                <option value="1w-stale">💤 近1周未改变</option>
                                <option value="1m-stale">💤 近1月未改变</option>
                                <option value="lastCheckIn" disabled={!hasLastCheckIn}>到上次打卡</option>
                                <option value="all">全部历史</option>
                            </select>
                        </th>
                        <th>
                            <div className="chronology-calendar-chevron" onClick={shiftMonth(1)}>
                                <span className="chevron right"></span>
                            </div>
                        </th>
                    </tr>
                    <tr>
                        {daysOfTheWeek.map(dow => <th className="chronology-grid-dayofweek" key={dow} >
                            {
                                dow || !isToday && <span className="chronology-calendar-todaylink chronology-calendar-selectable" 
                                title="today"
                                onClick={selectToday} >⏎</span>
                            } 
                        </th>)}
                    </tr>
                </thead>
                <tbody>
                    {monthRange.map(week => (
                        <Week
                            key={week[1]}
                            week={week}
                            current={current}
                            onChange={handleChange}
                            punchInMode={punchInMode}
                            onTogglePunchInDate={onTogglePunchInDate}
                            checkInPresetsMap={checkInPresetsMap}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};