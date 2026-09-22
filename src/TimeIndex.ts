import { getChronologySettings } from 'src/main';

import { App, TFile, moment } from "obsidian";
import { CalendarItem, CalendarItemType } from "./CalendarType";
import { compareDisplayedPropertyItemLists, getDisplayedPropertyItems, hasAnyTrackedProperty, matchesNoteFilter } from "./noteFilterSettings";
import type { NoteFilterState } from "./noteFilterSettings";
import type { DateDisplayMode } from "./timeIndexSettings";
import { isPathExcluded, normalizeExcludedFolders } from "./timeIndexSettings";

export interface ITimeIndex {
    getHeatForDate(date: string): number;
    getNotesForCalendarItem(item: CalendarItem, dateDisplayMode?: DateDisplayMode, filter?: NoteFilterState, desc?: boolean, sortByTime?: boolean): NoteAttributes[];
}

export enum DateAttribute {
    Created,
    Modified,
    Both
}

export enum SortingStrategy {
    Created,
    Modified,
    Mixed
}


const LIMIT_TIME_DIFF_MS = 60 * 60 * 1000;
const HEAT_SCALE=10;
export interface NoteAttributes {
    note: TFile;
    time: number;
    attribute: DateAttribute;
    activeDays?: number;
    staleDays?: number;
    activeDaysWindow?: number;
}


export class TimeIndex implements ITimeIndex {

    app: App;

    index?: Map<string, NoteAttributes[]>;
    indexSettingsKey?: string;
    activityHistory: Map<string, Set<string>> = new Map();

    constructor(app: App) {
        this.app = app;
    } 

    resetCache(){
        this.index = undefined;
        this.indexSettingsKey = undefined;
    }

    recordActivity(filePath: string, dateStr?: string) {
        const d = dateStr || moment().format("YYYY-MM-DD");
        let set = this.activityHistory.get(filePath);
        if (!set) {
            set = new Set();
            this.activityHistory.set(filePath, set);
        }
        set.add(d);
    }

    loadActivityHistory(history: Record<string, string[]>) {
        if (!history || typeof history !== "object") return;
        for (const [path, dates] of Object.entries(history)) {
            if (!Array.isArray(dates)) continue;
            let set = this.activityHistory.get(path);
            if (!set) {
                set = new Set();
                this.activityHistory.set(path, set);
            }
            for (const d of dates) {
                if (typeof d === "string") set.add(d);
            }
        }
    }

    exportActivityHistory(): Record<string, string[]> {
        const result: Record<string, string[]> = {};
        for (const [path, set] of this.activityHistory.entries()) {
            if (set.size > 0) {
                result[path] = Array.from(set).sort();
            }
        }
        return result;
    }

    getActivityDates(note: TFile, createdDate?: string, modifiedDate?: string, hasTrackedProps = true): Set<string> {
        const settings = getChronologySettings();
        const expr = settings?.trackedPropertiesExpression?.trim();

        if (expr) {
            // When tracked properties are configured:
            // 1. If the note does not possess any tracked property, return empty set (0 active days)
            if (!hasTrackedProps) {
                return new Set();
            }
            // 2. Only return dates actually recorded in activityHistory (real tracked changes)
            const set = this.activityHistory.get(note.path);
            return set ? new Set(set) : new Set();
        }

        // When no tracked properties expression configured, fall back to file mtime / ctime
        const set = this.activityHistory.get(note.path);
        const result = set ? new Set(set) : new Set<string>();
        if (createdDate) result.add(createdDate);
        if (modifiedDate) result.add(modifiedDate);
        return result;
    }

    countActiveDaysInPeriod(
        note: TFile,
        fromTime: moment.Moment,
        toTime: moment.Moment,
        createdDate: string,
        modifiedDate: string,
        hasTrackedProps = true
    ): number {
        const dates = this.getActivityDates(note, createdDate, modifiedDate, hasTrackedProps);
        if (dates.size === 0) return 0;
        let count = 0;
        for (const dateStr of dates) {
            const m = moment(dateStr, "YYYY-MM-DD");
            if (m.isValid() && m.isSameOrAfter(fromTime, "day") && m.isSameOrBefore(toTime, "day")) {
                count++;
            }
        }
        return count;
    }

    getNotesForCalendarItem(
        item: CalendarItem,
        dateDisplayMode: DateDisplayMode = getChronologySettings().dateDisplayMode,
        filter?: NoteFilterState,
        desc = true,
        sortByTime = false
    ): NoteAttributes[] {
        const settings = getChronologySettings();
        const sortingStrategy = this.getSortingStrategy(dateDisplayMode);
        const excludedFolders = normalizeExcludedFolders(settings.excludedFolders);
        const allNotes = this.app.vault.getFiles().filter(f =>
            (f.extension === 'md' || f.extension === 'canvas') &&
            !isPathExcluded(f.path, excludedFolders)
        );
        const { fromTime, toTime } = item.getTimeRange();
        const safeToTime = toTime ?? fromTime;
        let rebuildCache = false;
        const indexSettingsKey = this.getIndexSettingsKey(sortingStrategy, excludedFolders);
        if (!this.index || this.indexSettingsKey !== indexSettingsKey) {
            rebuildCache = true;
            this.index = new Map<string, NoteAttributes[]>();
            this.indexSettingsKey = indexSettingsKey;
        } else {
            
            if (item.type === CalendarItemType.Day) {
                const day = item.date.format("YYYY-MM-DD");
                if (this.index.has(day)) {
                    const notes =  this.index.get(day) as NoteAttributes[];
                    return this.sortNotes(this.applyFilter(notes, filter), desc, sortByTime);
                } else {
                    return [];
                }
            }


        }
 
        let notes = allNotes.reduce<NoteAttributes[]>((acc, note) => {
            let createdTime = moment(note.stat.ctime);
            let modifiedTime = moment(note.stat.mtime);
            const creationStr = settings.creationDateAttribute;
            const modifiedStr = settings.modifiedDateAttribute;
            const fileCache = this.app.metadataCache.getFileCache(note);
            const frontmatter = fileCache?.frontmatter as Record<string, unknown> | undefined;
            const hasTrackedProps = hasAnyTrackedProperty(frontmatter, settings.trackedPropertiesExpression);

            if(creationStr || modifiedStr ){
                if(frontmatter){
                    if(creationStr){
                        const ctime = frontmatter[creationStr];
                        if(ctime){
                            createdTime = moment(ctime as any);
                        }
                    }
                    if(modifiedStr){
                        const mtime = frontmatter[modifiedStr];
                        if(mtime){
                            modifiedTime = moment(mtime as any);
                        }
                    }
                }
            }

            const isAll = item.type === CalendarItemType.All;
            const isStale = item.type === CalendarItemType.StaleRange || item.isStaleFilter === true;
            const matchCreated = isAll || createdTime.isBetween(fromTime, safeToTime);
            const matchModified = isAll || modifiedTime.isBetween(fromTime, safeToTime);
            const createdDate = createdTime.format("YYYY-MM-DD");
            const modifiedDate = modifiedTime.format("YYYY-MM-DD");

            const customWindow = settings.activeDaysWindowDays;
            let activeDaysFrom = fromTime;
            let activeDaysTo = safeToTime;
            let activeDaysWindow = 0;

            if (customWindow && customWindow > 0) {
                activeDaysTo = moment().endOf("day");
                activeDaysFrom = moment().startOf("day").subtract(customWindow - 1, "days");
                activeDaysWindow = customWindow;
            } else if (!isAll) {
                activeDaysWindow = Math.max(1, safeToTime.diff(fromTime, "days") + 1);
            }

            const activeDays = !hasTrackedProps
                ? 0
                : (isStale
                    ? this.countActiveDaysInPeriod(note, fromTime, safeToTime, createdDate, modifiedDate, hasTrackedProps)
                    : this.countActiveDaysInPeriod(note, activeDaysFrom, activeDaysTo, createdDate, modifiedDate, hasTrackedProps));

            const staleDays = Math.max(0, moment().startOf("day").diff(modifiedTime.clone().startOf("day"), "days"));

            // use momentjs to find the time difference between createdTime and modifiedTime
            const timeDiffMs = moment.duration(modifiedTime.diff(createdTime)).asMilliseconds();

            // gets the createdTime as a number
            const ctime = createdTime.valueOf();
            const mtime = modifiedTime.valueOf();

            const createdInfo: NoteAttributes = {
                note,
                time: ctime,
                attribute: DateAttribute.Created,
                activeDays,
                staleDays,
                activeDaysWindow
            };
            const modifiedInfo: NoteAttributes = {
                note,
                time: mtime,
                attribute: DateAttribute.Modified,
                activeDays,
                staleDays,
                activeDaysWindow
            };

            if (isStale) {
                if (activeDays === 0) {
                    acc.push(modifiedInfo);
                }
                return acc;
            }

            if(rebuildCache && this.index){
                // stores the note in the cache with an entry 
                // for each day it was modified or created
                const createdDate = createdTime.format("YYYY-MM-DD");
                const modifiedDate = modifiedTime.format("YYYY-MM-DD");
                if(!this.index.has(createdDate)){
                    this.index.set(createdDate, []);
                }
                if(!this.index.has(modifiedDate)){
                    this.index.set(modifiedDate, []);
                }
                
                if(sortingStrategy === SortingStrategy.Mixed
                    ||
                    sortingStrategy === SortingStrategy.Created    
                ) { 
                    this.index.get(createdDate)!.push(createdInfo);
                }
                if(sortingStrategy === SortingStrategy.Mixed
                    ||
                    sortingStrategy === SortingStrategy.Modified    
                ) {
                    this.index.get(modifiedDate)!.push(modifiedInfo);
                }
                
            }

            if (sortingStrategy === SortingStrategy.Mixed && matchCreated && matchModified && timeDiffMs > LIMIT_TIME_DIFF_MS) {
                acc.push(createdInfo);
                acc.push(modifiedInfo);
                return acc;
            }

            if ((sortingStrategy === SortingStrategy.Mixed || sortingStrategy === SortingStrategy.Created)
                && matchCreated
            ) {
                acc.push(createdInfo);
                return acc;
            }
            if ((sortingStrategy === SortingStrategy.Mixed || sortingStrategy === SortingStrategy.Modified)
                && matchModified
            ) {
                acc.push(modifiedInfo);
                return acc
            }

            return acc;
        }, [])

            ;

        notes = this.sortNotes(this.applyFilter(notes, filter), desc, sortByTime);

        return notes;
    }

    // private getTimeRange(item: CalendarItem) {
    //     let fromTime: moment.Moment, toTime: moment.Moment;

    //     function getMomentTimeRange(period: moment.unitOfTime.StartOf) {
    //         fromTime = moment(item.date).startOf(period);
    //         toTime = moment(item.date).endOf(period);
    //         return { fromTime, toTime };
    //     }

    //     switch (item.type) {
    //         case (CalendarItemType.Year):
    //             return getMomentTimeRange("year");
    //             break;
    //         case (CalendarItemType.Month):
    //             return getMomentTimeRange("month");
    //             break;
    //         case (CalendarItemType.Week):
    //             return getMomentTimeRange("week");
    //             break;
    //         case (CalendarItemType.Day):
    //             return getMomentTimeRange("day");
    //             break;
    //         default:
    //             throw new Error("Unknown Calendar Item Type!!!");
    //             break;
    //     }

    // }

    sortNotes(items: NoteAttributes[], desc = false, sortByTime = false): NoteAttributes[] {
        const settings = getChronologySettings();
        const sortProps = settings.sortByProperty
            ? [settings.sortByProperty]
            : settings.displayedProperties;
        const res = items.sort((a,b)=> {
            if (!sortByTime && sortProps.length > 0) {
                const propertyOrder = compareDisplayedPropertyItemLists(
                    getDisplayedPropertyItems(this.app.metadataCache.getFileCache(a.note), sortProps, a.note),
                    getDisplayedPropertyItems(this.app.metadataCache.getFileCache(b.note), sortProps, b.note)
                );
                if (propertyOrder !== 0) {
                    return propertyOrder;
                }
            }
            return desc ? b.time-a.time : a.time-b.time;
        })
        return res;
    }

    private getSortingStrategy(dateDisplayMode: DateDisplayMode): SortingStrategy {
        const strategies: Record<DateDisplayMode, SortingStrategy> = {
            both: SortingStrategy.Mixed,
            created: SortingStrategy.Created,
            modified: SortingStrategy.Modified
        };

        return strategies[dateDisplayMode];
    }

    private applyFilter(items: NoteAttributes[], filter: NoteFilterState | undefined): NoteAttributes[] {
        if (!filter) {
            return items;
        }

        return items.filter((item) => {
            const fileWithContext = Object.assign(item.note, {
                activeDays: item.activeDays,
                staleDays: item.staleDays,
                activeDaysWindow: item.activeDaysWindow
            });
            return matchesNoteFilter(fileWithContext, this.app.metadataCache.getFileCache(item.note), filter);
        });
    }

    private getIndexSettingsKey(sortingStrategy: SortingStrategy, excludedFolders: readonly string[]): string {
        const settings = getChronologySettings();
        return [
            sortingStrategy,
            settings.creationDateAttribute || "",
            settings.modifiedDateAttribute || "",
            excludedFolders.join("\n")
        ].join("|");
    }


    getHeatForDate(date: string | moment.Moment): number {
        if(!getChronologySettings().computeHeat) return 0;
        const mom = moment(date);


        const items = this.getNotesForCalendarItem(new CalendarItem(mom));

        // this formula is logaritmic
        const heat = Math.log(items.length+1)/Math.log(getChronologySettings().avgDailyNotes*HEAT_SCALE);

        return heat;
    }
}


export class MockTimeIndex implements ITimeIndex {
    getNotesForCalendarItem(item: CalendarItem, dateDisplayMode?: DateDisplayMode, filter?: NoteFilterState) {

        return [];
    }


    getHeatForDate(date: string | moment.Moment): number {
        const mom = moment(date);

        return mom.date() / 31;

    }

}



