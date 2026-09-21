import { getChronologySettings } from 'src/main';

import { App, TFile, moment } from "obsidian";
import { CalendarItem, CalendarItemType } from "./CalendarType";
import { compareDisplayedPropertyItemLists, getDisplayedPropertyItems, matchesNoteFilter } from "./noteFilterSettings";
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
}


export class TimeIndex implements ITimeIndex {

    app: App;

    index?: Map<string, NoteAttributes[]>;
    indexSettingsKey?: string;

    constructor(app: App) {
        this.app = app;
    } 

    resetCache(){
        this.index = undefined;
        this.indexSettingsKey = undefined;
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
            if(creationStr || modifiedStr ){
                const md = app.metadataCache.getFileCache(note);
                if(md?.frontmatter){
                    if(creationStr){
                        const ctime = md.frontmatter[creationStr];
                        if(ctime){
                            createdTime = moment(ctime);
                        }
                    }
                    if(modifiedStr){
                        const mtime = md.frontmatter[modifiedStr];
                        if(mtime){
                            modifiedTime = moment(mtime);
                        }
                    }
                }
            }

            

            const matchCreated = createdTime.isBetween(fromTime, toTime);
            const matchModified = modifiedTime.isBetween(fromTime, toTime);
            // use momentjs to find the time difference between createdTime and modifiedTime
            const timeDiffMs = moment.duration(modifiedTime.diff(createdTime)).asMilliseconds();

            // gets the createdTime as a number
            const ctime = createdTime.valueOf();
            const mtime = modifiedTime.valueOf();

            const createdInfo = {
                note,
                time: ctime,
                attribute: DateAttribute.Created
            };
            const modifiedInfo = {
                note,
                time: mtime,
                attribute: DateAttribute.Modified
            };

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

        return items.filter((item) =>
            matchesNoteFilter(item.note, this.app.metadataCache.getFileCache(item.note), filter)
        );
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



