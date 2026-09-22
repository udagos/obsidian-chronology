
import type { App, TFile } from "obsidian";

export async function updateNoteFrontmatterProperty(
    app: App,
    file: TFile,
    propertyKey: string,
    propertyValue: string
): Promise<void> {
    const fileManager = app.fileManager as unknown as {
        processFrontMatter?: (file: TFile, fn: (frontmatter: Record<string, unknown>) => void) => Promise<void>;
    };
    if (typeof fileManager?.processFrontMatter === "function") {
        await fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
            fm[propertyKey] = propertyValue;
        });
        return;
    }

    const content = await app.vault.read(file);
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
    const match = content.match(frontmatterRegex);

    if (match) {
        const body = content.slice(match[0].length);
        const yamlLines = match[1].split(/\r?\n/);
        let keyFound = false;
        const newYamlLines = yamlLines.map((line) => {
            const propMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:/);
            if (propMatch && propMatch[1] === propertyKey) {
                keyFound = true;
                return `${propertyKey}: "${propertyValue}"`;
            }
            return line;
        });
        if (!keyFound) {
            newYamlLines.push(`${propertyKey}: "${propertyValue}"`);
        }
        const newContent = `---\n${newYamlLines.join("\n")}\n---${body}`;
        await app.vault.modify(file, newContent);
    } else {
        const newContent = `---\n${propertyKey}: "${propertyValue}"\n---\n${content}`;
        await app.vault.modify(file, newContent);
    }
}

export function groupBy<T>(items: T[], selector: (item:T)=>any ){
    return items.reduce((acc: {[key: string]:T[]},item:T)=>{
        const key = selector(item).toString();
        if(key in acc) acc[key].push(item)
        else acc[key] = [item];
        return acc;
    },{});
}

export function groupByOrdered<T>(items: T[], selector: (item:T)=>any ){
    const groups:any[] = [];
    const groupedBy = items.reduce((acc: {[key: string]:T[]},item:T)=>{
        const key = selector(item).toString();
        if(key in acc) acc[key].push(item)
        else {
            acc[key] = [item];
            groups.push(key);
        }
        return acc;
    },{});

    return groups.map(group => ({group, items: groupedBy[group]}));
}

export const range = (min:number, max:number) => Array.from({ length: max - min + 1 }, (_, i) => min + i) as number[];


