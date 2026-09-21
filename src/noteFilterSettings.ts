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

function splitTopLevelCommas(input: string): string[] {
    const results: string[] = [];
    let current = "";
    let depth = 0;

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "(" || ch === "（") {
            depth++;
            current += ch;
        } else if (ch === ")" || ch === "）") {
            if (depth > 0) depth--;
            current += ch;
        } else if ((ch === "," || ch === "，" || ch === "\n") && depth === 0) {
            const trimmed = current.trim();
            if (trimmed) {
                results.push(trimmed);
            }
            current = "";
        } else {
            current += ch;
        }
    }

    const lastTrimmed = current.trim();
    if (lastTrimmed) {
        results.push(lastTrimmed);
    }

    return results;
}

export function normalizeFilterQuery(values: readonly string[] | string | undefined): string[] {
    if (!values) {
        return [];
    }

    const rawList: string[] = [];
    if (typeof values === "string") {
        rawList.push(...splitTopLevelCommas(values));
    } else {
        for (const item of values) {
            if (typeof item === "string") {
                rawList.push(...splitTopLevelCommas(item));
            }
        }
    }

    const normalized: string[] = [];
    for (const value of rawList) {
        const trimmed = value.trim();
        if (trimmed && !normalized.includes(trimmed)) {
            normalized.push(trimmed);
        }
    }

    return normalized;
}

export function matchesNoteFilter(file: FileLike, metadata: MetadataLike | null | undefined, filter: NoteFilterState): boolean {
    if (filter.kind === "all" || filter.query.length === 0) {
        return true;
    }

    const matched = matchesFilterQuery(file, metadata, filter);
    return filter.invert ? !matched : matched;
}

export function getDisplayedPropertyValues(metadata: CachedMetadata | null | undefined, propertyNames: readonly string[], file?: FileLike | null): string[] {
    return getDisplayedPropertyItems(metadata, propertyNames, file).map((item) => item.label);
}

export function getDisplayedPropertyItems(metadata: CachedMetadata | null | undefined, propertyNames: readonly string[], file?: FileLike | null): DisplayedPropertyItem[] {
    return propertyNames
        .flatMap((name) => getDisplayedPropertyItemsForName(metadata, name, file))
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
            return matchesProperty(metadata, filter.query, file);
        case "folder":
            return matchesFolder(file, filter.query);
        case "all":
            return true;
        default:
            return true;
    }
}

export type FilterAstNode =
    | { type: "or"; children: FilterAstNode[] }
    | { type: "and"; children: FilterAstNode[] }
    | { type: "not"; child: FilterAstNode }
    | { type: "atom"; raw: string };

export type TokenType = "OR" | "AND" | "NOT" | "LPAREN" | "RPAREN" | "ATOM";

export interface Token {
    type: TokenType;
    value: string;
}

export function tokenizeFilterQuery(query: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const len = query.length;
    let atomBuffer = "";

    function flushAtom() {
        const trimmed = atomBuffer.trim();
        if (trimmed) {
            tokens.push({ type: "ATOM", value: trimmed });
        }
        atomBuffer = "";
    }

    while (i < len) {
        const ch = query[i];

        if (ch === "(" || ch === "（") {
            flushAtom();
            tokens.push({ type: "LPAREN", value: ch });
            i++;
            continue;
        }

        if (ch === ")" || ch === "）") {
            flushAtom();
            tokens.push({ type: "RPAREN", value: ch });
            i++;
            continue;
        }

        if (ch === "&") {
            flushAtom();
            if (i + 1 < len && query[i + 1] === "&") {
                i++;
            }
            tokens.push({ type: "AND", value: "&" });
            i++;
            continue;
        }

        if (ch === "," || ch === "，" || ch === "\n") {
            flushAtom();
            tokens.push({ type: "OR", value: ch });
            i++;
            continue;
        }

        if (ch === "~") {
            if (!atomBuffer.trim()) {
                atomBuffer = "";
                tokens.push({ type: "NOT", value: "~" });
                i++;
                continue;
            }
            const trimmedBuf = atomBuffer.trim();
            const lastChar = trimmedBuf.slice(-1);
            if (/\d/.test(lastChar) || lastChar === ":") {
                atomBuffer += ch;
                i++;
                continue;
            } else {
                flushAtom();
                tokens.push({ type: "NOT", value: "~" });
                i++;
                continue;
            }
        }

        atomBuffer += ch;
        i++;
    }

    flushAtom();
    return tokens;
}

function parseOr(tokens: Token[], cursor: { pos: number }): FilterAstNode | null {
    const left = parseAnd(tokens, cursor);
    if (!left) return null;

    const children: FilterAstNode[] = [left];
    while (cursor.pos < tokens.length && tokens[cursor.pos].type === "OR") {
        cursor.pos++;
        const right = parseAnd(tokens, cursor);
        if (right) {
            children.push(right);
        }
    }

    return children.length === 1 ? children[0] : { type: "or", children };
}

function parseAnd(tokens: Token[], cursor: { pos: number }): FilterAstNode | null {
    const left = parseUnary(tokens, cursor);
    if (!left) return null;

    const children: FilterAstNode[] = [left];
    while (cursor.pos < tokens.length && tokens[cursor.pos].type === "AND") {
        cursor.pos++;
        const right = parseUnary(tokens, cursor);
        if (right) {
            children.push(right);
        }
    }

    return children.length === 1 ? children[0] : { type: "and", children };
}

function parseUnary(tokens: Token[], cursor: { pos: number }): FilterAstNode | null {
    if (cursor.pos < tokens.length && tokens[cursor.pos].type === "NOT") {
        cursor.pos++;
        const child = parseUnary(tokens, cursor);
        if (child) {
            return { type: "not", child };
        }
        return null;
    }
    return parsePrimary(tokens, cursor);
}

function parsePrimary(tokens: Token[], cursor: { pos: number }): FilterAstNode | null {
    if (cursor.pos >= tokens.length) return null;

    const token = tokens[cursor.pos];
    if (token.type === "LPAREN") {
        cursor.pos++;
        const expr = parseOr(tokens, cursor);
        if (cursor.pos < tokens.length && tokens[cursor.pos].type === "RPAREN") {
            cursor.pos++;
        }
        return expr;
    }

    if (token.type === "ATOM") {
        cursor.pos++;
        return { type: "atom", raw: token.value };
    }

    cursor.pos++;
    return null;
}

export function parseFilterExpression(query: string): FilterAstNode | null {
    const tokens = tokenizeFilterQuery(query);
    if (tokens.length === 0) {
        return null;
    }
    const cursor = { pos: 0 };
    return parseOr(tokens, cursor);
}

export function parseFilterQueries(queries: readonly string[]): FilterAstNode | null {
    const validAsts: FilterAstNode[] = [];
    for (const q of queries) {
        const ast = parseFilterExpression(q);
        if (ast) {
            validAsts.push(ast);
        }
    }
    if (validAsts.length === 0) return null;
    if (validAsts.length === 1) return validAsts[0];
    return { type: "or", children: validAsts };
}

export function evaluateAst(node: FilterAstNode, evalAtom: (raw: string) => boolean): boolean {
    switch (node.type) {
        case "or":
            return node.children.length === 0 ? true : node.children.some((child) => evaluateAst(child, evalAtom));
        case "and":
            return node.children.every((child) => evaluateAst(child, evalAtom));
        case "not":
            return !evaluateAst(node.child, evalAtom);
        case "atom":
            return evalAtom(node.raw);
    }
}

function isQueryInverted(query: string): boolean {
    const trimmed = query.trim();
    return trimmed.startsWith("~") || trimmed.startsWith("#~");
}

function stripQueryInversion(query: string): string {
    const trimmed = query.trim();
    if (trimmed.startsWith("#~")) {
        return trimmed.slice(2).trim();
    }
    if (trimmed.startsWith("~")) {
        return trimmed.slice(1).trim();
    }
    return trimmed;
}

function evalTagAtom(metadata: MetadataLike | null | undefined, raw: string): boolean {
    const trimmed = raw.trim();
    if (!trimmed) return true;
    const isInverted = isQueryInverted(trimmed);
    const tag = normalizeTag(stripQueryInversion(trimmed));
    if (!tag) return true;

    const tags = new Set<string>();
    metadata?.tags?.forEach((t) => tags.add(normalizeTag(t.tag)));
    const frontmatterTags = metadata?.frontmatter?.tags;
    readFrontmatterTags(frontmatterTags).forEach((t) => tags.add(normalizeTag(t)));

    const matched = tags.has(tag);
    return isInverted ? !matched : matched;
}

export function matchesTag(metadata: MetadataLike | null | undefined, queries: readonly string[]): boolean {
    const ast = parseFilterQueries(queries);
    if (!ast) return true;
    return evaluateAst(ast, (raw) => evalTagAtom(metadata, raw));
}

function evalFolderAtom(file: FileLike, raw: string): boolean {
    const trimmed = raw.trim();
    if (!trimmed) return true;
    let inverted = false;
    let path = trimmed;
    if (path.startsWith("~")) {
        inverted = true;
        path = path.slice(1).trim();
    }
    const folders = normalizeExcludedFolders([path]);
    const matched = isPathExcluded(file.path, folders);
    return inverted ? !matched : matched;
}

export function matchesFolder(file: FileLike, queries: readonly string[]): boolean {
    const ast = parseFilterQueries(queries);
    if (!ast) return true;
    return evaluateAst(ast, (raw) => evalFolderAtom(file, raw));
}

export interface ParsedPropertyCondition {
    readonly propertyName: string;
    readonly invert: boolean;
    readonly kind: "presence" | "numeric_comparison" | "numeric_range" | "text_comparison" | "text_include";
    readonly operator?: string;
    readonly targetNumber?: number;
    readonly rangeMin?: number;
    readonly rangeMax?: number;
    readonly targetText?: string;
}

export function parseNumericValue(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isNaN(value) ? null : value;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const num = Number(trimmed);
        if (!Number.isNaN(num)) {
            return num;
        }
        if (trimmed.endsWith("%")) {
            const percentNum = Number(trimmed.slice(0, -1).trim());
            if (!Number.isNaN(percentNum)) {
                return percentNum;
            }
        }
    }
    return null;
}

export function parsePropertyQuery(query: string): ParsedPropertyCondition | null {
    let trimmed = query.trim();
    if (!trimmed) return null;

    let invert = false;
    if (trimmed.startsWith("~")) {
        invert = true;
        trimmed = trimmed.slice(1).trim();
    }

    let propertyName = "";
    let valExpr = "";

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx >= 0) {
        propertyName = trimmed.slice(0, colonIdx).trim();
        valExpr = trimmed.slice(colonIdx + 1).trim();
    } else {
        const opMatch = trimmed.match(/^([^:><!=~]+?)\s*(>=|<=|!=|<>|==|=|>|<)\s*(.+)$/);
        if (opMatch) {
            propertyName = opMatch[1].trim();
            valExpr = `${opMatch[2]} ${opMatch[3].trim()}`;
        } else {
            propertyName = trimmed;
            valExpr = "";
        }
    }

    if (!propertyName) return null;

    if (valExpr.startsWith("~")) {
        invert = true;
        valExpr = valExpr.slice(1).trim();
    }

    if (!valExpr) {
        return { propertyName, invert, kind: "presence" };
    }

    // 1. Numeric range: min..max or min~max
    const rangeMatch = valExpr.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(?:\.\.|~)\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/);
    if (rangeMatch) {
        const min = parseFloat(rangeMatch[1]);
        const max = parseFloat(rangeMatch[2]);
        return {
            propertyName,
            invert,
            kind: "numeric_range",
            rangeMin: Math.min(min, max),
            rangeMax: Math.max(min, max)
        };
    }

    // 2. Numeric comparison with operator: >=, <=, !=, <>, ==, =, >, <
    const numCompMatch = valExpr.match(/^(>=|<=|!=|<>|==|=|>|<)\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/);
    if (numCompMatch) {
        const operator = numCompMatch[1];
        const targetNumber = parseFloat(numCompMatch[2]);
        return {
            propertyName,
            invert,
            kind: "numeric_comparison",
            operator,
            targetNumber
        };
    }

    // 3. Exact operator with text: ==, =, !=, <>
    const textCompMatch = valExpr.match(/^(==|=|!=|<>)\s*(.+)$/);
    if (textCompMatch) {
        const operator = textCompMatch[1];
        const targetText = textCompMatch[2].trim();
        return {
            propertyName,
            invert,
            kind: "text_comparison",
            operator,
            targetText
        };
    }

    // 4. Single number without operator: e.g. "5"
    const singleNumMatch = valExpr.match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/);
    if (singleNumMatch) {
        const targetNumber = parseFloat(singleNumMatch[1]);
        return {
            propertyName,
            invert,
            kind: "numeric_comparison",
            operator: "=",
            targetNumber,
            targetText: valExpr
        };
    }

    // 5. General text inclusion
    return {
        propertyName,
        invert,
        kind: "text_include",
        targetText: valExpr
    };
}

function compareNumbers(actual: number, operator: string, target: number): boolean {
    switch (operator) {
        case ">": return actual > target;
        case ">=": return actual >= target;
        case "<": return actual < target;
        case "<=": return actual <= target;
        case "=":
        case "==": return actual === target;
        case "!=":
        case "<>": return actual !== target;
        default: return false;
    }
}

export interface BreadcrumbsEdgeInfo {
    readonly targetPath: string;
    readonly targetBasename: string;
    readonly edgeType: string;
    readonly explicit: boolean;
}

export function getBreadcrumbsPluginInstance(): unknown {
    if (typeof window === "undefined") return undefined;
    const win = window as unknown as Record<string, unknown>;
    const bcApi = win.BCAPI as { plugin?: unknown } | undefined;
    if (bcApi?.plugin) {
        return bcApi.plugin;
    }
    const appObj = win.app as { plugins?: { getPlugin?: (id: string) => unknown; plugins?: Record<string, unknown> } } | undefined;
    if (appObj?.plugins) {
        if (typeof appObj.plugins.getPlugin === "function") {
            const p = appObj.plugins.getPlugin("breadcrumbs");
            if (p) return p;
        }
        if (appObj.plugins.plugins && appObj.plugins.plugins["breadcrumbs"]) {
            return appObj.plugins.plugins["breadcrumbs"];
        }
    }
    return undefined;
}

export function getBreadcrumbsOutgoingEdges(filePath: string, fieldName: string): BreadcrumbsEdgeInfo[] {
    if (!filePath || !fieldName) return [];
    const plugin = getBreadcrumbsPluginInstance() as {
        graph?: {
            has_node?: (path: string) => boolean;
            edge_types?: () => string[];
            get_filtered_outgoing_edges?: (node: string, edgeTypes?: string[] | null) => {
                get_edges?: () => Array<{
                    edge_type?: string;
                    target_path?: (graph: unknown) => string;
                    explicit?: (graph: unknown) => boolean;
                }>;
                to_array?: () => Array<{
                    edge_type?: string;
                    target_path?: (graph: unknown) => string;
                    explicit?: (graph: unknown) => boolean;
                }>;
            };
        };
    } | undefined;

    const graph = plugin?.graph;
    if (!graph || typeof graph.get_filtered_outgoing_edges !== "function") {
        return [];
    }

    if (typeof graph.has_node === "function" && !graph.has_node(filePath)) {
        return [];
    }

    let fieldsToQuery = [fieldName];
    if (typeof graph.edge_types === "function") {
        try {
            const allTypes = graph.edge_types();
            if (Array.isArray(allTypes)) {
                const lowerTarget = fieldName.toLowerCase();
                const matched = allTypes.filter((t) => typeof t === "string" && t.toLowerCase() === lowerTarget);
                if (matched.length > 0) {
                    fieldsToQuery = matched;
                }
            }
        } catch {
            // Ignore edge_types lookup error
        }
    }

    try {
        const edgeList = graph.get_filtered_outgoing_edges(filePath, fieldsToQuery);
        if (!edgeList) return [];
        const rawEdges = typeof edgeList.get_edges === "function"
            ? edgeList.get_edges()
            : (typeof edgeList.to_array === "function" ? edgeList.to_array() : []);

        const results: BreadcrumbsEdgeInfo[] = [];
        for (const edge of rawEdges) {
            const targetPath = typeof edge.target_path === "function"
                ? edge.target_path(graph)
                : (typeof (edge as unknown as { target?: string }).target === "string"
                    ? (edge as unknown as { target: string }).target
                    : "");
            if (!targetPath) continue;
            const targetBasename = targetPath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? targetPath;
            const edgeType = edge.edge_type ?? fieldName;
            const explicit = typeof edge.explicit === "function" ? edge.explicit(graph) : true;
            results.push({
                targetPath,
                targetBasename,
                edgeType,
                explicit
            });
        }
        return results;
    } catch {
        return [];
    }
}

function getFrontmatterProperty(frontmatter: Record<string, unknown>, propName: string): { exists: boolean; value: unknown } {
    if (propName in frontmatter) {
        return { exists: true, value: frontmatter[propName] };
    }
    const lower = propName.toLowerCase();
    for (const key of Object.keys(frontmatter)) {
        if (key.toLowerCase() === lower) {
            return { exists: true, value: frontmatter[key] };
        }
    }
    return { exists: false, value: undefined };
}

function matchesSinglePropertyCondition(
    frontmatter: Record<string, unknown> | undefined,
    condition: ParsedPropertyCondition,
    file?: FileLike | null
): boolean {
    let hasProp = false;
    let actualValue: unknown = undefined;

    if (frontmatter) {
        const prop = getFrontmatterProperty(frontmatter, condition.propertyName);
        if (prop.exists) {
            hasProp = true;
            actualValue = prop.value;
        }
    }

    if (!hasProp && file?.path) {
        const bcEdges = getBreadcrumbsOutgoingEdges(file.path, condition.propertyName);
        if (bcEdges.length > 0) {
            hasProp = true;
            const targetBasenames = bcEdges.map((e) => e.targetBasename);
            const targetWikilinks = bcEdges.map((e) => `[[${e.targetBasename}]]`);
            const targetPaths = bcEdges.map((e) => e.targetPath);
            actualValue = [...new Set([...targetBasenames, ...targetWikilinks, ...targetPaths])];
        }
    }

    if (!hasProp) {
        return false;
    }

    switch (condition.kind) {
        case "presence":
            return actualValue !== undefined && actualValue !== null && actualValue !== "";

        case "numeric_range": {
            const min = condition.rangeMin!;
            const max = condition.rangeMax!;
            if (Array.isArray(actualValue)) {
                return actualValue.some((item) => {
                    const n = parseNumericValue(item);
                    return n !== null && n >= min && n <= max;
                });
            }
            const n = parseNumericValue(actualValue);
            return n !== null && n >= min && n <= max;
        }

        case "numeric_comparison": {
            const op = condition.operator!;
            const target = condition.targetNumber!;
            if (Array.isArray(actualValue)) {
                const numMatch = actualValue.some((item) => {
                    const n = parseNumericValue(item);
                    return n !== null && compareNumbers(n, op, target);
                });
                if (numMatch) return true;
                if (condition.targetText && (op === "=" || op === "==")) {
                    return actualValue.some((item) =>
                        propertyValueToText(item).toLowerCase().includes(condition.targetText!.toLowerCase())
                    );
                }
                return false;
            }

            const n = parseNumericValue(actualValue);
            if (n !== null) {
                return compareNumbers(n, op, target);
            }
            if (condition.targetText && (op === "=" || op === "==")) {
                return propertyValueToText(actualValue).toLowerCase().includes(condition.targetText.toLowerCase());
            }
            return false;
        }

        case "text_comparison": {
            const op = condition.operator!;
            const target = condition.targetText!.toLowerCase();
            if (Array.isArray(actualValue)) {
                return actualValue.some((item) => {
                    const text = propertyValueToText(item).toLowerCase();
                    return (op === "=" || op === "==") ? text === target : text !== target;
                });
            }
            const text = propertyValueToText(actualValue).toLowerCase();
            return (op === "=" || op === "==") ? text === target : text !== target;
        }

        case "text_include": {
            const target = condition.targetText!.toLowerCase();
            return propertyValueToText(actualValue).toLowerCase().includes(target);
        }

        default:
            return false;
    }
}

function evalPropertyAtom(metadata: MetadataLike | null | undefined, raw: string, file?: FileLike | null): boolean {
    const cond = parsePropertyQuery(raw);
    if (!cond) return true;

    const frontmatter = metadata?.frontmatter;
    const matched = matchesSinglePropertyCondition(frontmatter, cond, file);
    return cond.invert ? !matched : matched;
}

export function matchesProperty(metadata: MetadataLike | null | undefined, queries: readonly string[], file?: FileLike | null): boolean {
    const ast = parseFilterQueries(queries);
    if (!ast) return true;
    return evaluateAst(ast, (raw) => evalPropertyAtom(metadata, raw, file));
}

export function splitPropertyQuery(query: string): readonly [string, string] {
    const trimmed = query.trim();
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex >= 0) {
        return [trimmed.slice(0, separatorIndex).trim(), trimmed.slice(separatorIndex + 1).trim()];
    }

    const opMatch = trimmed.match(/^([^:><!=~]+?)\s*(>=|<=|!=|<>|==|=|>|<)\s*(.+)$/);
    if (opMatch) {
        return [opMatch[1].trim(), `${opMatch[2]} ${opMatch[3].trim()}`];
    }

    return [trimmed, ""];
}

function getDisplayedPropertyItemsForName(metadata: CachedMetadata | null | undefined, name: string, file?: FileLike | null): DisplayedPropertyItem[] {
    if (name.startsWith("#")) {
        return getDisplayedTagValue(metadata, name);
    }

    let value = metadata?.frontmatter?.[name];
    let isBreadcrumbs = false;

    if ((value === undefined || value === null || value === "") && file?.path) {
        const bcEdges = getBreadcrumbsOutgoingEdges(file.path, name);
        if (bcEdges.length > 0) {
            value = [...new Set(bcEdges.map((e) => e.targetBasename))];
            isBreadcrumbs = true;
        }
    }

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
        title: emoji ? `${name}: ${text}` : (isBreadcrumbs ? `${name}: ${text} (Breadcrumbs)` : name),
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
