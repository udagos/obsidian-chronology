import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as esbuild from "esbuild";

const tempDir = await mkdtemp(path.join(tmpdir(), "chronology-tests-"));
const outputFile = path.join(tempDir, "timeIndexSettings.mjs");

try {
	await esbuild.build({
		entryPoints: ["src/timeIndexSettings.ts"],
		bundle: true,
		format: "esm",
		platform: "node",
		outfile: outputFile,
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
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
