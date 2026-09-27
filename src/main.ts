/* eslint-disable @typescript-eslint/no-unused-vars */
import { CalendarView, CALENDAR_VIEW } from './Views/CalendarView';
import { App, Modal, Notice, Plugin, TFile, moment } from 'obsidian';
import { ChronologySettingTab } from 'src/ChronologySettingTab';
import { DEFAULT_NOTE_FILTER_STATE, hasAnyTrackedProperty, isNoteCreatedInRange, matchesPropertyChangeExpression, normalizeDisplayedProperties, normalizeFilterPresets, normalizeFilterState } from './noteFilterSettings';
import type { FilterPreset, NoteFilterState } from './noteFilterSettings';
import type { DateDisplayMode } from './timeIndexSettings';
import { normalizeDateDisplayMode, normalizeExcludedFolders } from './timeIndexSettings';
import { updateNoteFrontmatterProperty } from './utils';


export interface ChronologyPluginSettings {
    addRibbonIcon: boolean;
    launchOnStartup: boolean;
    use24Hours: boolean;
    avgDailyNotes: number;
    useSimpleList: boolean;
    groupItemsInSameSlot: boolean;
    firstDayOfWeek: number;
    creationDateAttribute?: string;
    modifiedDateAttribute?: string;
    computeHeat?: boolean;
    excludedFolders: string[];
    dateDisplayMode: DateDisplayMode;
    lockedNoteFilter: NoteFilterState;
    displayedProperties: string[];
    sortByProperty: string;
    sortByTime: boolean;
    sortDesc: boolean;
    presets: FilterPreset[];
    activePresetId?: string | null;
    noteActivityHistory?: Record<string, string[]>;
    trackedPropertiesExpression?: string;
    showActiveDaysChip?: boolean;
    activeDaysWindowDays: number;
    syncActiveDaysToFrontmatter: boolean;
    activeDaysPropertyName: string;
    activeDaysCreatedRange: string;
}

const DEFAULT_SETTINGS: ChronologyPluginSettings = {
    addRibbonIcon: true,
    launchOnStartup: true,
    use24Hours: true,
    avgDailyNotes: 3,
    useSimpleList: false,
    groupItemsInSameSlot: false,
    firstDayOfWeek: -1, // locale default
    creationDateAttribute: "",
    modifiedDateAttribute: "",
    computeHeat: true,
    excludedFolders: [],
    dateDisplayMode: "both",
    lockedNoteFilter: DEFAULT_NOTE_FILTER_STATE,
    displayedProperties: [],
    sortByProperty: "",
    sortByTime: false,
    sortDesc: true,
    presets: [],
    activePresetId: null,
    noteActivityHistory: {},
    trackedPropertiesExpression: "",
    showActiveDaysChip: true,
    activeDaysWindowDays: 7,
    syncActiveDaysToFrontmatter: true,
    activeDaysPropertyName: "active_days",
    activeDaysCreatedRange: "",
}

let expSettings: ChronologyPluginSettings;
let expPlugin: ChronologyPlugin | undefined;

export function getChronologySettings(){return expSettings;}
export function getChronologyPlugin(){return expPlugin;}

export async function updateChronologySettings(partial: Partial<ChronologyPluginSettings>) {
    if (expPlugin) {
        expPlugin.settings = {
            ...expPlugin.settings,
            ...partial,
        };
        expSettings = expPlugin.settings;
        await expPlugin.saveSettings();
    } else if (expSettings) {
        Object.assign(expSettings, partial);
    }
}

export default class ChronologyPlugin extends Plugin {
    settings: ChronologyPluginSettings;
    ribbonIconEl: HTMLElement | null;
    propertySnapshots: Map<string, Record<string, unknown>> = new Map();

    async onload() {
        expPlugin = this;
        await this.loadSettings();

        this.registerView(
            CALENDAR_VIEW,
            (leaf) => new CalendarView(leaf)
        );

        if(this.settings.addRibbonIcon){
            this.addIcon();
        }

        this.app.workspace.onLayoutReady(()=>{
            this.initializePropertySnapshots();
            if(this.settings.launchOnStartup){
                this.activateView();
            }
        })

        this.addCommand({
            id: "show-chronology-view",
            name: "Show Sidebar",
            callback: () => this.activateView(),
          });

        this.addCommand({
            id: "sync-all-notes-active-days",
            name: "同步所有笔记的变动天数到属性 (Sync Active Days to Frontmatter)",
            callback: () => this.updateAllNotesActiveDaysProperty(true),
        });

        this.addSettingTab(new ChronologySettingTab(this.app, this));

        this.registerEvent(
            this.app.vault.on("modify", (file) => {
                if (file instanceof TFile && (file.extension === "md" || file.extension === "canvas")) {
                    const expr = this.settings.trackedPropertiesExpression?.trim();
                    let shouldRecord = true;

                    if (expr) {
                        const currentFm = (this.app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined) || {};
                        const oldFm = this.propertySnapshots.get(file.path);
                        const changedProps = new Set<string>();

                        if (!hasAnyTrackedProperty(currentFm, expr)) {
                            // Note does not contain any tracked properties
                            shouldRecord = false;
                        } else if (oldFm) {
                            const allKeys = new Set([...Object.keys(oldFm), ...Object.keys(currentFm)]);
                            for (const k of allKeys) {
                                if (k === "position") continue;
                                const oldVal = oldFm[k];
                                const newVal = currentFm[k];
                                if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                                    changedProps.add(k.toLowerCase());
                                }
                            }
                            shouldRecord = changedProps.size > 0 && matchesPropertyChangeExpression(expr, changedProps);
                        } else {
                            // First time seeing this file, save current snapshot as baseline without recording
                            shouldRecord = false;
                        }

                        this.propertySnapshots.set(file.path, { ...currentFm });
                    }

                    if (shouldRecord) {
                        const todayStr = moment().format("YYYY-MM-DD");
                        if (!this.settings.noteActivityHistory) {
                            this.settings.noteActivityHistory = {};
                        }
                        const list = this.settings.noteActivityHistory[file.path] || [];
                        if (!list.includes(todayStr)) {
                            list.push(todayStr);
                            this.settings.noteActivityHistory[file.path] = list;
                            void this.saveSettings();
                        }

                        if (this.settings.syncActiveDaysToFrontmatter) {
                            const cachedFm = this.app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
                            const inCreationRange = isNoteCreatedInRange(
                                file,
                                cachedFm,
                                this.settings.activeDaysCreatedRange,
                                this.settings.creationDateAttribute
                            );
                            if (inCreationRange) {
                                const propName = (this.settings.activeDaysPropertyName || "active_days").trim();
                                if (propName) {
                                    const customWindow = this.settings.activeDaysWindowDays > 0 ? this.settings.activeDaysWindowDays : 7;
                                    const toTime = moment().endOf("day");
                                    const fromTime = moment().startOf("day").subtract(customWindow - 1, "days");
                                    let activeDays = 0;
                                    for (const d of list) {
                                        const m = moment(d, "YYYY-MM-DD");
                                        if (m.isValid() && m.isSameOrAfter(fromTime, "day") && m.isSameOrBefore(toTime, "day")) {
                                            activeDays++;
                                        }
                                    }
                                    void updateNoteFrontmatterProperty(this.app, file, propName, activeDays);
                                }
                            }
                        }
                    }
                }
            })
        );
    }

    async updateAllNotesActiveDaysProperty(showNotice = false): Promise<number> {
        if (!this.settings.syncActiveDaysToFrontmatter) {
            if (showNotice) {
                new Notice("未开启【同步写入变动天数到笔记属性】设置");
            }
            return 0;
        }

        const propName = (this.settings.activeDaysPropertyName || "active_days").trim();
        if (!propName) return 0;

        const expr = this.settings.trackedPropertiesExpression?.trim();
        const files = this.app.vault.getFiles().filter(f => f.extension === "md" || f.extension === "canvas");

        const customWindow = this.settings.activeDaysWindowDays > 0 ? this.settings.activeDaysWindowDays : 7;
        const toTime = moment().endOf("day");
        const fromTime = moment().startOf("day").subtract(customWindow - 1, "days");

        let updatedCount = 0;

        for (const file of files) {
            const fm = this.app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
            if (!isNoteCreatedInRange(file, fm, this.settings.activeDaysCreatedRange, this.settings.creationDateAttribute)) {
                continue;
            }

            const hasTracked = hasAnyTrackedProperty(fm, expr);

            let activeDays = 0;
            if (hasTracked) {
                const dates = this.settings.noteActivityHistory?.[file.path];
                if (Array.isArray(dates)) {
                    for (const d of dates) {
                        const m = moment(d, "YYYY-MM-DD");
                        if (m.isValid() && m.isSameOrAfter(fromTime, "day") && m.isSameOrBefore(toTime, "day")) {
                            activeDays++;
                        }
                    }
                }
            } else if (fm && !(propName in fm)) {
                // Note lacks tracked properties and doesn't have active_days, skip
                continue;
            }

            const currentVal = fm?.[propName];
            if (currentVal === activeDays) {
                continue;
            }

            try {
                await updateNoteFrontmatterProperty(this.app, file, propName, activeDays);
                const snap = this.propertySnapshots.get(file.path) || {};
                snap[propName] = activeDays;
                this.propertySnapshots.set(file.path, snap);
                updatedCount++;
            } catch (err) {
                console.error(`Failed to update ${propName} for ${file.path}`, err);
            }
        }

        if (showNotice) {
            new Notice(`已完成变动天数同步：更新了 ${updatedCount} 篇笔记中的 "${propName}" 属性（窗口: ${customWindow}天）`);
        }

        return updatedCount;
    }

    private initializePropertySnapshots() {
        const files = this.app.vault.getFiles();
        for (const file of files) {
            if (file.extension === "md" || file.extension === "canvas") {
                const fm = this.app.metadataCache.getFileCache(file)?.frontmatter as Record<string, unknown> | undefined;
                if (fm) {
                    this.propertySnapshots.set(file.path, { ...fm });
                }
            }
        }
    }

    public addIcon() {
        this.removeIcon();
        this.ribbonIconEl = this.addRibbonIcon('clock', 'Open Chronology', (evt: MouseEvent) => {
            this.activateView();
        });
        this.ribbonIconEl.addClass('chronology-ribbon-class');
    }

    public removeIcon(){
        if(this.ribbonIconEl){
            this.ribbonIconEl.remove();
            this.ribbonIconEl = null;
        }
    }

    onunload() {
        expPlugin = undefined;
        // this.app.workspace.detachLeavesOfType(CALENDAR_VIEW);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.settings.excludedFolders = normalizeExcludedFolders(this.settings.excludedFolders);
        this.settings.dateDisplayMode = normalizeDateDisplayMode(this.settings.dateDisplayMode);
        this.settings.lockedNoteFilter = normalizeFilterState(this.settings.lockedNoteFilter);
        this.settings.displayedProperties = normalizeDisplayedProperties(this.settings.displayedProperties);
        this.settings.sortByTime = this.settings.sortByTime === true;
        this.settings.sortDesc = this.settings.sortDesc !== false;
        this.settings.presets = normalizeFilterPresets(this.settings.presets);
        if (this.settings.activePresetId && !this.settings.presets.some((p) => p.id === this.settings.activePresetId)) {
            this.settings.activePresetId = null;
        }
        expSettings = this.settings;
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView() {
        // this.app.workspace.detachLeavesOfType(CALENDAR_VIEW);
        let leaf = this.app.workspace.getLeavesOfType(CALENDAR_VIEW)[0];
        if (!leaf) {
            await this.app.workspace.getRightLeaf(false).setViewState({
                type: CALENDAR_VIEW,
                active: true
            });
            leaf = this.app.workspace.getLeavesOfType(CALENDAR_VIEW)[0];
        }


        leaf && this.app.workspace.revealLeaf(leaf);
    }
}




