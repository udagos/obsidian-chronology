import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const tempDir = await mkdtemp(path.join(tmpdir(), "chronology-tests-"));
const outputFile = path.join(tempDir, "timeIndexSettings.mjs");
const filterOutputFile = path.join(tempDir, "noteFilterSettings.mjs");

try {
	await esbuild.build({
		entryPoints: ["src/timeIndexSettings.ts", "src/noteFilterSettings.ts"],
		bundle: true,
		format: "esm",
		platform: "node",
		outdir: tempDir,
		outExtension: { ".js": ".mjs" },
		logLevel: "silent",
	});

	const {
		isPathExcluded,
		normalizeDateDisplayMode,
		normalizeExcludedFolders,
	} = await import(pathToFileURL(outputFile).href);

	const folders = normalizeExcludedFolders([
		" Archive ",
		"Archive/Sub/",
		"",
		"/Projects\\Client",
	]);

	assert.deepEqual(folders, ["Archive", "Archive/Sub", "Projects/Client"]);
	assert.equal(isPathExcluded("Archive/a.md", folders), true);
	assert.equal(isPathExcluded("Archive/Sub/b.md", folders), true);
	assert.equal(isPathExcluded("Archive-old/c.md", folders), false);
	assert.equal(isPathExcluded("Projects/Client/note.md", folders), true);
	assert.equal(isPathExcluded("Projects/Clientele/note.md", folders), false);

	assert.equal(normalizeDateDisplayMode("created"), "created");
	assert.equal(normalizeDateDisplayMode("modified"), "modified");
	assert.equal(normalizeDateDisplayMode("both"), "both");
	assert.equal(normalizeDateDisplayMode("unexpected"), "both");
	assert.equal(normalizeDateDisplayMode(undefined), "both");

	const {
		compareDisplayedPropertyItemLists,
		getDisplayedPropertyItems,
		getDisplayedPropertyValues,
		matchesNoteFilter,
		normalizeDisplayedProperties,
		normalizeFilterQuery,
		normalizeFilterState,
	} = await import(pathToFileURL(filterOutputFile).href);

	const file = { path: "Projects/Client/a.md" };
	const metadata = {
		tags: [{ tag: "#Work" }],
		frontmatter: {
			status: "draft",
			owner: "Ada",
			"obsidian-note-status": "📌",
			tags: ["Project"]
		}
	};

	assert.deepEqual(normalizeFilterQuery(" work,\nproject "), ["work", "project"]);
	assert.deepEqual(normalizeDisplayedProperties("status\nowner,#rew"), ["status", "owner", "#rew"]);
	assert.deepEqual(normalizeFilterState({ kind: "tag", query: ["work"], invert: true }), {
		kind: "tag",
		query: ["work"],
		invert: true
	});
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["work"], invert: false }), true);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["work"], invert: true }), false);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "property", query: ["status:dra"], invert: false }), true);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "folder", query: ["Projects/Client"], invert: false }), true);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "folder", query: ["Projects/Clientele"], invert: false }), false);
	assert.deepEqual(getDisplayedPropertyValues(metadata, ["status", "owner", "missing"]), ["Ada", "draft"]);
	assert.deepEqual(getDisplayedPropertyValues(metadata, ["up", "next", "#work"]), ["#work"]);
	assert.deepEqual(getDisplayedPropertyValues(metadata, ["obsidian-note-status"]), ["📌"]);

	assert.deepEqual(getDisplayedPropertyItems(metadata, ["status", "owner", "#work"]), [
		{ kind: "property", name: "owner", label: "Ada", title: "owner", sortKey: "ada" },
		{ kind: "property", name: "status", label: "draft", title: "status", sortKey: "draft" },
		{ kind: "tag", name: "#work", label: "#work", title: "#work", sortKey: "work" },
	]);
	assert.equal(compareDisplayedPropertyItemLists(getDisplayedPropertyItems(metadata, ["status"]), []), -1);
	assert.equal(compareDisplayedPropertyItemLists([], getDisplayedPropertyItems(metadata, ["status"])), 1);
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
