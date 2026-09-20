/* eslint-disable @typescript-eslint/no-unused-vars */
import { CalendarView, CALENDAR_VIEW } from './Views/CalendarView';
import { App, Modal, Plugin } from 'obsidian';
import { ChronologySettingTab } from 'src/ChronologySettingTab';
import { DEFAULT_NOTE_FILTER_STATE, normalizeDisplayedProperties, normalizeFilterPresets, normalizeFilterState } from './noteFilterSettings';
import type { FilterPreset, NoteFilterState } from './noteFilterSettings';
import type { DateDisplayMode } from './timeIndexSettings';
import { normalizeDateDisplayMode, normalizeExcludedFolders } from './timeIndexSettings';


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
            if(this.settings.launchOnStartup){
                this.activateView();
            }
        })

        this.addCommand({
            id: "show-chronology-view",
            name: "Show Sidebar",
            callback: () => this.activateView(),
          });

        
        this.addSettingTab(new ChronologySettingTab(this.app, this));


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




