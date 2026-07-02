export type DateDisplayMode = "both" | "created" | "modified";

export function normalizeExcludedFolders(paths: readonly string[] | undefined): string[] {
    if (!paths) {
        return [];
    }

    const folders = new Set<string>();
    for (const path of paths) {
        const normalized = normalizeVaultPath(path);
        if (normalized) {
            folders.add(normalized);
        }
    }

    return [...folders];
}

export function isPathExcluded(filePath: string, excludedFolders: readonly string[]): boolean {
    const normalizedFilePath = normalizeVaultPath(filePath);
    return excludedFolders.some((folder) =>
        normalizedFilePath === folder || normalizedFilePath.startsWith(`${folder}/`)
    );
}

export function normalizeDateDisplayMode(value: unknown): DateDisplayMode {
    switch (value) {
        case "both":
        case "created":
        case "modified":
            return value;
        default:
            return "both";
    }
}

function normalizeVaultPath(path: string): string {
    return path
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\/+$/, "");
}
