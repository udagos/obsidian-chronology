import type { CachedMetadata, TFile } from "obsidian";
import { isPathExcluded, normalizeDateDisplayMode, normalizeExcludedFolders } from "./timeIndexSettings";
import type { DateDisplayMode } from "./timeIndexSettings";

export type NoteFilterKind = "all" | "tag" | "property" | "folder";

export interface FilterPreset {
    readonly id: string;
    readonly name: string;
    readonly dateDisplayMode: DateDisplayMode;
    readonly filterKind: NoteFilterKind;
    readonly filterQuery: string;
    readonly filterInvert: boolean;
    readonly sortByTime: boolean;
    readonly sortDesc: boolean;
}

export function normalizeFilterPresets(presets: unknown): FilterPreset[] {
    if (!Array.isArray(presets)) {
        return [];
    }
    const result: FilterPreset[] = [];
    for (const item of presets) {
        if (!item || typeof item !== "object") continue;
        const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : String(Date.now() + Math.random());
        const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : "未命名预设";
        const dateDisplayMode = normalizeDateDisplayMode(item.dateDisplayMode);
        const filterKind = normalizeFilterKind(item.filterKind);
        const filterQuery = typeof item.filterQuery === "string" ? item.filterQuery : "";
        const filterInvert = item.filterInvert === true;
        const sortByTime = item.sortByTime === true;
        const sortDesc = item.sortDesc !== false;
        result.push({
            id,
            name,
            dateDisplayMode,
            filterKind,
            filterQuery,
            filterInvert,
            sortByTime,
            sortDesc
        });
    }
    return result;
}

export interface NoteFilterState {
    readonly kind: NoteFilterKind;
    readonly query: readonly string[];
    readonly invert: boolean;
}

export const DEFAULT_NOTE_FILTER_STATE: NoteFilterState = {
    kind: "all",
    query: [],
    invert: false
};

export interface MetadataLike {
    readonly tags?: readonly { readonly tag: string }[];
    readonly frontmatter?: Record<string, unknown>;
}

export interface FileLike {
    readonly path: string;
}

export type DisplayedPropertyKind = "property" | "tag";

export interface DisplayedPropertyItem {
    readonly kind: DisplayedPropertyKind;
    readonly name: string;
    readonly label: string;
    readonly title: string;
    readonly sortKey: string;
}

export function normalizeFilterState(value: Partial<NoteFilterState> | undefined): NoteFilterState {
    if (!value) {
        return DEFAULT_NOTE_FILTER_STATE;
    }

    return {
        kind: normalizeFilterKind(value.kind),
        query: normalizeFilterQuery(value.query),
        invert: value.invert === true
    };
}

export function normalizeFilterQuery(values: readonly string[] | string | undefined): string[] {
    if (!values) {
        return [];
    }

    const rawValues = typeof values === "string" ? values.split(/[\n,]/) : values;
    const normalized = new Set<string>();
    for (const value of rawValues) {
        const trimmed = value.trim();
        if (trimmed) {
            normalized.add(trimmed);
        }
    }

    return [...normalized];
}

export function matchesNoteFilter(file: FileLike, metadata: MetadataLike | null | undefined, filter: NoteFilterState): boolean {
    if (filter.kind === "all" || filter.query.length === 0) {
        return true;
    }

    const matched = matchesFilterQuery(file, metadata, filter);
    return filter.invert ? !matched : matched;
}

export function getDisplayedPropertyValues(metadata: CachedMetadata | null | undefined, propertyNames: readonly string[]): string[] {
    return getDisplayedPropertyItems(metadata, propertyNames).map((item) => item.label);
}

export function getDisplayedPropertyItems(metadata: CachedMetadata | null | undefined, propertyNames: readonly string[]): DisplayedPropertyItem[] {
    return propertyNames
        .flatMap((name) => getDisplayedPropertyItemsForName(metadata, name))
        .sort(compareDisplayedPropertyItems);
}

export function compareDisplayedPropertyItems(left: DisplayedPropertyItem, right: DisplayedPropertyItem): number {
    const leftKind = left.kind === "property" ? 0 : 1;
    const rightKind = right.kind === "property" ? 0 : 1;
    if (leftKind !== rightKind) {
        return leftKind - rightKind;
    }

    const bySortKey = left.sortKey.localeCompare(right.sortKey, undefined, { sensitivity: "base" });
    if (bySortKey !== 0) {
        return bySortKey;
    }

    const byTitle = left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
    if (byTitle !== 0) {
        return byTitle;
    }

    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
}

export function compareDisplayedPropertyItemLists(left: readonly DisplayedPropertyItem[], right: readonly DisplayedPropertyItem[]): number {
    if (left.length === 0 && right.length === 0) {
        return 0;
    }

    if (left.length === 0) {
        return 1;
    }

    if (right.length === 0) {
        return -1;
    }

    const limit = Math.min(left.length, right.length);
    for (let index = 0; index < limit; index += 1) {
        const byItem = compareDisplayedPropertyItems(left[index], right[index]);
        if (byItem !== 0) {
            return byItem;
        }
    }

    return left.length - right.length;
}

export function normalizeDisplayedProperties(values: readonly string[] | string | undefined): string[] {
    return normalizeFilterQuery(values);
}

export function getFolderPath(file: TFile): string {
    const separatorIndex = file.path.lastIndexOf("/");
    if (separatorIndex < 0) {
        return "";
    }

    return file.path.slice(0, separatorIndex);
}

function matchesFilterQuery(file: FileLike, metadata: MetadataLike | null | undefined, filter: NoteFilterState): boolean {
    switch (filter.kind) {
        case "tag":
            return matchesTag(metadata, filter.query);
        case "property":
            return matchesProperty(metadata, filter.query);
        case "folder":
            return isPathExcluded(file.path, normalizeExcludedFolders(filter.query));
        case "all":
            return true;
        default:
            return true;
    }
}

function matchesTag(metadata: MetadataLike | null | undefined, queries: readonly string[]): boolean {
    const tags = new Set<string>();
    metadata?.tags?.forEach((tag) => tags.add(normalizeTag(tag.tag)));
    const frontmatterTags = metadata?.frontmatter?.tags;
    readFrontmatterTags(frontmatterTags).forEach((tag) => tags.add(normalizeTag(tag)));
    return queries.some((query) => tags.has(normalizeTag(query)));
}

function matchesProperty(metadata: MetadataLike | null | undefined, queries: readonly string[]): boolean {
    const frontmatter = metadata?.frontmatter;
    if (!frontmatter) {
        return false;
    }

    return queries.some((query) => {
        const [name, expectedValue] = splitPropertyQuery(query);
        if (!(name in frontmatter)) {
            return false;
        }

        if (!expectedValue) {
            return true;
        }

        const actualValue = frontmatter[name];
        return propertyValueToText(actualValue).toLowerCase().includes(expectedValue.toLowerCase());
    });
}

function splitPropertyQuery(query: string): readonly [string, string] {
    const separatorIndex = query.indexOf(":");
    if (separatorIndex < 0) {
        return [query.trim(), ""];
    }

    return [query.slice(0, separatorIndex).trim(), query.slice(separatorIndex + 1).trim()];
}

function getDisplayedPropertyItemsForName(metadata: CachedMetadata | null | undefined, name: string): DisplayedPropertyItem[] {
    if (name.startsWith("#")) {
        return getDisplayedTagValue(metadata, name);
    }

    const value = metadata?.frontmatter?.[name];
    const text = formatPropertyValue(value);
    if (text === undefined) {
        return [];
    }

    const emoji = resolveNoteStatusEmoji(name, text);
    const label = emoji ? emoji : text;

    return [{
        kind: "property",
        name,
        label,
        title: emoji ? `${name}: ${text}` : name,
        sortKey: normalizeSortText(text)
    }];
}

export function resolveNoteStatusEmoji(propertyName: string, valueText: string): string | undefined {
    if (!valueText) return undefined;

    const emojiRegex = /(\p{Extended_Pictographic}|\p{Emoji_Presentation})/u;
    if (emojiRegex.test(valueText)) {
        return valueText.trim();
    }

    // Only map text to status emoji for obsidian-note-status property
    const isStatusProp = propertyName === "obsidian-note-status" ||
                         propertyName.toLowerCase() === "obsidian-note-status" ||
                         propertyName.toLowerCase() === "note-status";

    if (!isStatusProp) {
        return undefined;
    }

    const parts = valueText.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
        const resolvedParts = parts.map((part) => resolveSingleStatusEmoji(propertyName, part) || part);
        if (resolvedParts.some((p) => emojiRegex.test(p))) {
            return resolvedParts.join(" ");
        }
        return undefined;
    }

    return resolveSingleStatusEmoji(propertyName, valueText);
}

function resolveSingleStatusEmoji(propertyName: string, statusIdentifier: string): string | undefined {
    const raw = statusIdentifier.trim();
    if (!raw) return undefined;

    let templateId: string | undefined;
    let statusName = raw;

    if (raw.includes(":")) {
        const idx = raw.indexOf(":");
        templateId = raw.slice(0, idx).trim();
        statusName = raw.slice(idx + 1).trim();
    }

    // 1. Dynamic lookup from active obsidian-note-status plugin instance if available
    try {
        const appObj = typeof window !== "undefined" ? (window as any).app : undefined;
        if (appObj?.plugins) {
            const plugin = appObj.plugins.getPlugin?.("obsidian-note-status") || appObj.plugins.plugins?.["obsidian-note-status"];
            if (plugin?.settings) {
                const settings = plugin.settings;
                const tagPrefix = settings.tagPrefix || "obsidian-note-status";
                const isStatusProp = propertyName === tagPrefix || propertyName === "obsidian-note-status" || propertyName.toLowerCase().includes("status");

                if (isStatusProp) {
                    if (Array.isArray(settings.customStatuses)) {
                        const match = settings.customStatuses.find((s: any) =>
                            s && (s.name === statusName || s.name?.toLowerCase() === statusName.toLowerCase())
                        );
                        if (match?.icon) return match.icon;
                    }

                    if (Array.isArray(settings.templates)) {
                        if (templateId) {
                            const tmpl = settings.templates.find((t: any) => t && (t.id === templateId || t.name === templateId));
                            if (tmpl && Array.isArray(tmpl.statuses)) {
                                const match = tmpl.statuses.find((s: any) =>
                                    s && (s.name === statusName || s.name?.toLowerCase() === statusName.toLowerCase())
                                );
                                if (match?.icon) return match.icon;
                            }
                        }

                        for (const tmpl of settings.templates) {
                            if (tmpl && Array.isArray(tmpl.statuses)) {
                                const match = tmpl.statuses.find((s: any) =>
                                    s && (s.name === statusName || s.name?.toLowerCase() === statusName.toLowerCase())
                                );
                                if (match?.icon) return match.icon;
                            }
                        }
                    }
                }
            }
        }
    } catch {
        // Fallback to built-in dictionary
    }

    // 2. Built-in predefined templates dictionary fallback
    const BUILTIN_STATUS_MAP: Record<string, string> = {
        // Digital Garden Workflow
        "seed": "🌰",
        "sprout": "🌱",
        "sapling": "🌿",
        "tree": "🌲",
        "map": "🗺️",
        "compost": "🍂",
        "flower": "🌸",
        "fruit": "🍎",
        // Academic Research
        "research": "🔍",
        "outline": "📑",
        "draft": "✏️",
        "revision": "📝",
        "final": "📚",
        "published": "🎓",
        // Colorful Workflow
        "idea": "💡",
        "inprogress": "🔧",
        "in-progress": "🔧",
        "editing": "🖊️",
        "pending": "⏳",
        "onhold": "⏸",
        "on-hold": "⏸",
        "needsupdate": "🔄",
        "completed": "✅",
        "archived": "📦",
        // Creative Writing
        "first-draft": "✍️",
        "final-polish": "✨",
        // Starter / Minimal
        "todo": "📌",
        "done": "✓",
        // Project Management
        "planning": "🗓️",
        "backlog": "📋",
        "ready": "🚦",
        "indevelopment": "👨‍💻",
        "testing": "🧪",
        "approved": "👍",
        "live": "🚀",
        // Research note
        "first pass": "🕵️",
        "second pass": "🕵️‍♀️",
        "complete": "✅"
    };

    if (BUILTIN_STATUS_MAP[statusName]) {
        return BUILTIN_STATUS_MAP[statusName];
    }

    const lowerName = statusName.toLowerCase();
    if (BUILTIN_STATUS_MAP[lowerName]) {
        return BUILTIN_STATUS_MAP[lowerName];
    }

    return undefined;
}

function formatPropertyValue(value: unknown): string | undefined {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    return propertyValueToText(value);
}

function getDisplayedTagValue(metadata: CachedMetadata | null | undefined, tag: string): DisplayedPropertyItem[] {
    const expectedTag = normalizeTag(tag);
    const tags = new Set<string>();
    metadata?.tags?.forEach((item) => tags.add(normalizeTag(item.tag)));
    readFrontmatterTags(metadata?.frontmatter?.tags).forEach((item) => tags.add(normalizeTag(item)));
    if (!tags.has(expectedTag)) {
        return [];
    }

    return [{
        kind: "tag",
        name: tag,
        label: `#${expectedTag}`,
        title: tag,
        sortKey: normalizeSortText(expectedTag)
    }];
}

function propertyValueToText(value: unknown): string {
    if (Array.isArray(value)) {
        return value.map((item) => propertyValueToText(item)).join(", ");
    }

    if (typeof value === "object" && value !== null) {
        return JSON.stringify(value);
    }

    return String(value);
}

function readFrontmatterTags(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((item) => String(item));
    }

    if (typeof value === "string") {
        return value.split(/[\s,]+/);
    }

    return [];
}

function normalizeTag(tag: string): string {
    return tag.trim().replace(/^#/, "").toLowerCase();
}

function normalizeSortText(value: string): string {
    return value.trim();
}

export function normalizeFilterKind(kind: unknown): NoteFilterKind {
    switch (kind) {
        case "tag":
        case "property":
        case "folder":
        case "all":
            return kind;
        default:
            return "all";
    }
}
