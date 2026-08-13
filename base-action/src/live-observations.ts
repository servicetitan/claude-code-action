import { readFileSync, statSync } from "fs";

type SafeObservation = {
  at?: unknown;
  kind?: unknown;
  status?: unknown;
  phase?: unknown;
  action?: unknown;
  subject?: unknown;
  durationMs?: unknown;
  error?: unknown;
};

const text = (value: unknown, maximum = 240): string | null =>
  typeof value === "string" ? value.slice(0, maximum) : null;

const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function formatSafeObservation(line: string): string | null {
  try {
    const value = JSON.parse(line) as SafeObservation;
    return `[agent-progress] ${JSON.stringify({
      at: text(value.at, 40),
      kind: text(value.kind, 40),
      status: text(value.status, 40),
      phase: text(value.phase, 80),
      action: text(value.action),
      subject: text(value.subject),
      durationMs: number(value.durationMs),
      error: text(value.error, 500),
    })}`;
  } catch {
    return null;
  }
}

export class LiveObservationReader {
  private offset = 0;
  private remainder = "";

  constructor(private readonly filePath: string | undefined) {}

  drain(): string[] {
    if (!this.filePath) return [];
    try {
      const size = statSync(this.filePath).size;
      if (size < this.offset) {
        this.offset = 0;
        this.remainder = "";
      }
      if (size === this.offset) return [];

      const contents = readFileSync(this.filePath)
        .subarray(this.offset)
        .toString("utf8");
      this.offset = size;
      const lines = `${this.remainder}${contents}`.split(/\r?\n/);
      this.remainder = lines.pop() ?? "";
      return lines
        .map(formatSafeObservation)
        .filter((line): line is string => line !== null);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
}
