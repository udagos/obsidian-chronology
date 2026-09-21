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
		normalizeFilterPresets,
		normalizeFilterQuery,
		normalizeFilterState,
		resolveNoteStatusEmoji,
	} = await import(pathToFileURL(filterOutputFile).href);

	const rawPresets = [
		{
			id: "preset-1",
			name: "Work Preset",
			dateDisplayMode: "created",
			filterKind: "property",
			filterQuery: "status:done",
			filterInvert: false,
			sortByTime: true,
			sortDesc: true,
		},
		{
			// invalid/empty fields
			id: "",
			name: "",
			dateDisplayMode: "invalid",
			filterKind: "unexpected",
			filterQuery: 123,
			filterInvert: "yes",
			sortByTime: null,
			sortDesc: false,
		}
	];
	const normalizedPresets = normalizeFilterPresets(rawPresets);
	assert.equal(normalizedPresets.length, 2);
	assert.equal(normalizedPresets[0].name, "Work Preset");
	assert.equal(normalizedPresets[0].dateDisplayMode, "created");
	assert.equal(normalizedPresets[0].filterKind, "property");
	assert.equal(normalizedPresets[0].sortByTime, true);
	assert.equal(normalizedPresets[1].name, "未命名预设");
	assert.equal(normalizedPresets[1].dateDisplayMode, "both");
	assert.equal(normalizedPresets[1].filterKind, "all");
	assert.equal(normalizedPresets[1].filterQuery, "");
	assert.equal(normalizedPresets[1].filterInvert, false);
	assert.equal(normalizedPresets[1].sortDesc, false);
	assert.deepEqual(normalizeFilterPresets(null), []);

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
	assert.deepEqual(normalizeFilterQuery("work，~project，archive"), ["work", "~project", "archive"]);
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

	// Tests for ~ negation and & (AND) in tag filter
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["~work"], invert: false }), false);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["~archive"], invert: false }), true);
	// Comma is OR: "work, ~project" is true because file has work
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["work", "~project"], invert: false }), true);
	// & is AND: "work & ~project" is false because file has project
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["work & ~project"], invert: false }), false);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["work & ~archive"], invert: false }), true);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["~#work"], invert: false }), false);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["#~archive"], invert: false }), true);
	// Parentheses grouping in tag filter:
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["(work, life) & ~archive"], invert: false }), true);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["(work, life) & ~project"], invert: false }), false);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "tag", query: ["(life, personal) & work"], invert: false }), false);

	// Tests for ~ negation, & (AND), and parentheses in folder filter
	assert.equal(matchesNoteFilter(file, metadata, { kind: "folder", query: ["Projects & ~Projects/Client"], invert: false }), false);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "folder", query: ["Projects & ~Projects/Archive"], invert: false }), true);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "folder", query: ["Projects, Personal"], invert: false }), true);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "folder", query: ["~Projects/Client"], invert: false }), false);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "folder", query: ["~Archive"], invert: false }), true);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "folder", query: ["(Projects, Archive) & ~Projects/Client"], invert: false }), false);
	assert.equal(matchesNoteFilter(file, metadata, { kind: "folder", query: ["(Projects, Archive) & ~Projects/Old"], invert: false }), true);

	// Tests for numeric comparison and ~ negation in property filter
	const numFile = { path: "Notes/task.md" };
	const numMetadata = {
		frontmatter: {
			priority: 3,
			rating: 4.5,
			score: "85",
			temp: -5,
			counts: [2, 7, 10],
			status: "done",
			archived: false,
		}
	};

	// Greater than (> and >=)
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: > 2"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: > 3"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: >= 3"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: >= 4"], invert: false }), false);

	// Less than (< and <=)
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: < 4"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: < 3"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: <= 3"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: <= 2"], invert: false }), false);

	// Equal (= and ==)
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: = 3"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: == 3"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: = 4"], invert: false }), false);

	// Not equal (!= and <>)
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: != 4"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: != 3"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: <> 3"], invert: false }), false);

	// Range (.. and ~)
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: 1..5"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: 1~5"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: 4..10"], invert: false }), false);

	// Query syntax without colon
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority > 2"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority <= 2"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority = 3"], invert: false }), true);

	// String numeric parsing, floats, negative numbers, arrays
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["score: >= 80"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["score: > 90"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["rating: >= 4.0"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["rating: < 4.0"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["temp: < 0"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["temp: >= 0"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["counts: > 9"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["counts: > 15"], invert: false }), false);

	// Property boolean expressions with comma (OR), & (AND), ~, and parentheses ()
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["~priority: > 2"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["~priority: > 5"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: ~> 2"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["~status: draft"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["status: ~done"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["status: done & ~priority: > 4"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["status: done & ~priority: > 2"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: >= 1 & ~priority: > 2"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: >= 1 & ~priority: > 4"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["priority: >= 1 & priority: <= 4"], invert: false }), true);

	// Complex parentheses grouping: (status: done, status: draft) & priority: = 3
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["(status: done, status: draft) & priority: = 3"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["（status: done，status: draft） & priority: = 3"], invert: false }), true); // Chinese parentheses and comma
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["(status: done, status: draft) & priority: > 5"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["(status: archived, status: draft) & priority: = 3"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["(status: archived, status: draft), priority: = 3"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["status: done & priority = 3 & rating > 4"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["status: done & priority = 3 & rating > 5"], invert: false }), false);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["~(priority > 5)"], invert: false }), true);
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["~(priority = 3)"], invert: false }), false);

	// Invert flag combined with ~
	assert.equal(matchesNoteFilter(numFile, numMetadata, { kind: "property", query: ["~priority: > 5"], invert: true }), false);
	assert.deepEqual(getDisplayedPropertyValues(metadata, ["status", "owner", "missing"]), ["Ada", "draft"]);
	assert.deepEqual(getDisplayedPropertyValues(metadata, ["up", "next", "#work"]), ["#work"]);
	assert.deepEqual(getDisplayedPropertyValues(metadata, ["obsidian-note-status"]), ["📌"]);

	// Test note-status emoji resolution
	assert.equal(resolveNoteStatusEmoji("obsidian-note-status", "digital-garden-workflow:seed"), "🌰");
	assert.equal(resolveNoteStatusEmoji("obsidian-note-status", "seed"), "🌰");
	assert.equal(resolveNoteStatusEmoji("obsidian-note-status", "sprout"), "🌱");
	assert.equal(resolveNoteStatusEmoji("obsidian-note-status", "inProgress"), "🔧");

	const gardenMeta = {
		frontmatter: {
			"obsidian-note-status": "digital-garden-workflow:seed"
		}
	};
	assert.deepEqual(getDisplayedPropertyItems(gardenMeta, ["obsidian-note-status"]), [
		{
			kind: "property",
			name: "obsidian-note-status",
			label: "🌰",
			title: "obsidian-note-status: digital-garden-workflow:seed",
			sortKey: "digital-garden-workflow:seed"
		}
	]);

	assert.deepEqual(getDisplayedPropertyItems(metadata, ["status", "owner", "#work"]), [
		{ kind: "property", name: "owner", label: "Ada", title: "owner", sortKey: "Ada" },
		{ kind: "property", name: "status", label: "draft", title: "status", sortKey: "draft" },
		{ kind: "tag", name: "#work", label: "#work", title: "#work", sortKey: "work" },
	]);
	assert.equal(compareDisplayedPropertyItemLists(getDisplayedPropertyItems(metadata, ["status"]), []), -1);
	assert.equal(compareDisplayedPropertyItemLists([], getDisplayedPropertyItems(metadata, ["status"])), 1);

	// Test Breadcrumbs implied edge (e.g. sumed) resolution
	const mockBcGraph = {
		has_node(path) {
			return path === "b.md";
		},
		edge_types() {
			return ["sum", "sumed", "up", "down"];
		},
		get_filtered_outgoing_edges(node, edgeTypes) {
			if (node === "b.md" && edgeTypes.map((t) => t.toLowerCase()).includes("sumed")) {
				return {
					get_edges() {
						return [
							{
								edge_type: "sumed",
								target_path(g) {
									return "Notes/a.md";
								},
								explicit(g) {
									return false;
								},
							},
						];
					},
				};
			}
			return {
				get_edges() {
					return [];
				},
			};
		},
	};

	globalThis.window = {
		BCAPI: {
			plugin: {
				graph: mockBcGraph,
			},
		},
	};

	try {
		const fileB = { path: "b.md" };
		const fileC = { path: "c.md" };
		const emptyMeta = { frontmatter: {} };

		// File b has no explicit sumed in frontmatter, but Breadcrumbs graph has implied edge sumed -> a
		assert.equal(matchesNoteFilter(fileB, emptyMeta, { kind: "property", query: ["sumed"], invert: false }), true);
		assert.equal(matchesNoteFilter(fileB, emptyMeta, { kind: "property", query: ["sumed: a"], invert: false }), true);
		assert.equal(matchesNoteFilter(fileB, emptyMeta, { kind: "property", query: ["sumed: [[a]]"], invert: false }), true);
		assert.equal(matchesNoteFilter(fileB, emptyMeta, { kind: "property", query: ["sumed: Notes/a.md"], invert: false }), true);
		assert.equal(matchesNoteFilter(fileB, emptyMeta, { kind: "property", query: ["sumed: z"], invert: false }), false);
		assert.equal(matchesNoteFilter(fileB, emptyMeta, { kind: "property", query: ["~sumed: z"], invert: false }), true);

		// File c has no sumed edge in graph
		assert.equal(matchesNoteFilter(fileC, emptyMeta, { kind: "property", query: ["sumed"], invert: false }), false);
		assert.equal(matchesNoteFilter(fileC, emptyMeta, { kind: "property", query: ["~sumed"], invert: false }), true);

		// Displayed properties for fileB should show Breadcrumbs target "a"
		const displayedBcItems = getDisplayedPropertyItems(emptyMeta, ["sumed"], fileB);
		assert.deepEqual(displayedBcItems, [
			{
				kind: "property",
				name: "sumed",
				label: "a",
				title: "sumed: a (Breadcrumbs)",
				sortKey: "a",
			},
		]);
	} finally {
		delete globalThis.window;
	}
} finally {
	await rm(tempDir, { recursive: true, force: true });
}
