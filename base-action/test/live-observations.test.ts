import { afterEach, describe, expect, test } from "bun:test";
import { appendFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  formatSafeObservation,
  LiveObservationReader,
} from "../src/live-observations";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("live observations", () => {
  test("prints only allowlisted fields", () => {
    const secret = "do-not-print-this-command";
    const output = formatSafeObservation(
      JSON.stringify({
        at: "2026-08-13T00:00:00Z",
        kind: "tool",
        status: "started",
        phase: "CAPTURE_VISUALS",
        action: "Capture visual surface",
        subject: "production:directory",
        durationMs: 123,
        error: null,
        data: { rawCommand: secret },
        targets: { token: secret },
      }),
    );

    expect(output).toContain("[agent-progress]");
    expect(output).toContain("CAPTURE_VISUALS");
    expect(output).not.toContain(secret);
    expect(output).not.toContain("rawCommand");
    expect(output).not.toContain("targets");
  });

  test("drains appended complete lines once", () => {
    const directory = mkdtempSync(join(tmpdir(), "live-observations-"));
    temporaryDirectories.push(directory);
    const file = join(directory, "events.jsonl");
    const reader = new LiveObservationReader(file);

    appendFileSync(file, '{"phase":"AUDIT","status":"started"}\n');
    expect(reader.drain()).toHaveLength(1);
    expect(reader.drain()).toEqual([]);
    appendFileSync(file, '{"phase":"CAPTURE"');
    expect(reader.drain()).toEqual([]);
    appendFileSync(file, ',"status":"completed"}\n');
    expect(reader.drain()).toHaveLength(1);
  });
});
