import type { CachedMetadata, TFile } from "obsidian";
import { isPathExcluded, normalizeExcludedFolders } from "./timeIndexSettings";

export type NoteFilterKind = "all" | "tag" | "property" | "folder";

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
    return propertyNames.flatMap((name) => {
        if (name.startsWith("#")) {
            return getDisplayedTagValue(metadata, name);
        }

        const value = metadata?.frontmatter?.[name];
        return formatPropertyValue(name, value);
    });
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

function formatPropertyValue(name: string, value: unknown): string[] {
    if (value === undefined || value === null || value === "") {
        return [];
    }

    return [`${name}: ${propertyValueToText(value)}`];
}

function getDisplayedTagValue(metadata: CachedMetadata | null | undefined, tag: string): string[] {
    const expectedTag = normalizeTag(tag);
    const tags = new Set<string>();
    metadata?.tags?.forEach((item) => tags.add(normalizeTag(item.tag)));
    readFrontmatterTags(metadata?.frontmatter?.tags).forEach((item) => tags.add(normalizeTag(item)));
    if (!tags.has(expectedTag)) {
        return [];
    }

    return [`#${expectedTag}`];
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
