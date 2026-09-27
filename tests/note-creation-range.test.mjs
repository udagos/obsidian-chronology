import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import moment from "moment";

const tempDir = await mkdtemp(path.join(tmpdir(), "chronology-range-tests-"));
const filterOutputFile = path.join(tempDir, "noteFilterSettings.mjs");

try {
	await esbuild.build({
		entryPoints: ["src/noteFilterSettings.ts"],
		bundle: true,
		format: "esm",
		platform: "node",
		outdir: tempDir,
		outExtension: { ".js": ".mjs" },
		logLevel: "silent",
		external: ["obsidian"],
	});

	globalThis.window = { moment };

	const {
		parseDaysRange,
		isNoteCreatedInRange,
	} = await import(pathToFileURL(filterOutputFile).href);

	// 1. parseDaysRange tests
	{
		assert.equal(parseDaysRange(""), null);
		assert.equal(parseDaysRange("   "), null);
		assert.equal(parseDaysRange(undefined), null);
		assert.equal(parseDaysRange(null), null);
		assert.equal(parseDaysRange("abc"), null);
		assert.equal(parseDaysRange("-5"), null);
		assert.equal(parseDaysRange("10-20-30"), null);

		assert.deepEqual(parseDaysRange("30"), { minDays: 0, maxDays: 30 });
		assert.deepEqual(parseDaysRange(" 7 "), { minDays: 0, maxDays: 7 });
		assert.deepEqual(parseDaysRange("0"), { minDays: 0, maxDays: 0 });

		assert.deepEqual(parseDaysRange("0-30"), { minDays: 0, maxDays: 30 });
		assert.deepEqual(parseDaysRange("7~30"), { minDays: 7, maxDays: 30 });
		assert.deepEqual(parseDaysRange("7..30"), { minDays: 7, maxDays: 30 });
		assert.deepEqual(parseDaysRange("7 30"), { minDays: 7, maxDays: 30 });
		assert.deepEqual(parseDaysRange(" 7 - 30 "), { minDays: 7, maxDays: 30 });

		assert.deepEqual(parseDaysRange("30-7"), { minDays: 7, maxDays: 30 });
		assert.deepEqual(parseDaysRange("30~0"), { minDays: 0, maxDays: 30 });
	}

	// 2. isNoteCreatedInRange tests
	{
		const baseNow = moment("2026-09-27T12:00:00.000Z");

		// Empty expression means no filter (always true)
		assert.equal(
			isNoteCreatedInRange({ stat: { ctime: baseNow.clone().subtract(100, "days").valueOf() } }, null, "", undefined, baseNow),
			true
		);
		assert.equal(
			isNoteCreatedInRange({ stat: { ctime: baseNow.clone().subtract(100, "days").valueOf() } }, null, null, undefined, baseNow),
			true
		);

		// 0-30 days range
		const expr30 = "0-30";
		assert.equal(
			isNoteCreatedInRange({ stat: { ctime: baseNow.clone().valueOf() } }, null, expr30, undefined, baseNow),
			true
		);
		assert.equal(
			isNoteCreatedInRange({ stat: { ctime: baseNow.clone().subtract(15, "days").valueOf() } }, null, expr30, undefined, baseNow),
			true
		);
		assert.equal(
			isNoteCreatedInRange({ stat: { ctime: baseNow.clone().startOf("day").subtract(30, "days").valueOf() } }, null, expr30, undefined, baseNow),
			true
		);
		assert.equal(
			isNoteCreatedInRange({ stat: { ctime: baseNow.clone().startOf("day").subtract(31, "days").valueOf() } }, null, expr30, undefined, baseNow),
			false
		);

		// 7-30 days range
		const expr7_30 = "7-30";
		assert.equal(
			isNoteCreatedInRange({ stat: { ctime: baseNow.clone().subtract(3, "days").valueOf() } }, null, expr7_30, undefined, baseNow),
			false
		);
		assert.equal(
			isNoteCreatedInRange({ stat: { ctime: baseNow.clone().subtract(7, "days").valueOf() } }, null, expr7_30, undefined, baseNow),
			true
		);
		assert.equal(
			isNoteCreatedInRange({ stat: { ctime: baseNow.clone().subtract(20, "days").valueOf() } }, null, expr7_30, undefined, baseNow),
			true
		);
		assert.equal(
			isNoteCreatedInRange({ stat: { ctime: baseNow.clone().subtract(35, "days").valueOf() } }, null, expr7_30, undefined, baseNow),
			false
		);

		// Priority of frontmatter creationDateAttribute over ctime
		const fileWithOldCtime = { stat: { ctime: baseNow.clone().subtract(100, "days").valueOf() } };
		const fmNew = { created_at: baseNow.clone().subtract(5, "days").format("YYYY-MM-DD") };
		assert.equal(
			isNoteCreatedInRange(fileWithOldCtime, fmNew, "0-30", "created_at", baseNow),
			true
		);

		const fileWithNewCtime = { stat: { ctime: baseNow.clone().subtract(2, "days").valueOf() } };
		const fmOld = { created_at: baseNow.clone().subtract(50, "days").format("YYYY-MM-DD") };
		assert.equal(
			isNoteCreatedInRange(fileWithNewCtime, fmOld, "0-30", "created_at", baseNow),
			false
		);

		assert.equal(
			isNoteCreatedInRange({ stat: {} }, {}, "0-30", undefined, baseNow),
			false
		);
	}

	console.log("All active-days-creation-range unit tests passed!");
} finally {
	delete globalThis.window;
	await rm(tempDir, { recursive: true, force: true });
}
