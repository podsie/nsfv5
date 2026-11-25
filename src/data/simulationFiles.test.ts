import { describe, expect, it } from "vitest";
import {
  fileRoleOf,
  sameSimulation,
  simulationNameOf,
  sortSimulationFiles,
} from "./simulationFiles";

describe("simulation files", () => {
  it("tells the two files apart by name", () => {
    expect(fileRoleOf("run.answers.tsv")).toBe("answers");
    expect(fileRoleOf("export.TSV")).toBe("answers");
    expect(fileRoleOf("run.decisions.jsonl")).toBe("decisions");
    expect(fileRoleOf("notes.pdf")).toBeNull();
  });

  it("reads the simulation's name from either file", () => {
    expect(simulationNameOf("optimal-18-weeks.answers.tsv")).toBe("optimal-18-weeks");
    expect(simulationNameOf("optimal-18-weeks.decisions.jsonl")).toBe("optimal-18-weeks");
    expect(simulationNameOf("export.tsv")).toBe("export");
  });

  it("sorts dropped files into their places", () => {
    const sorted = sortSimulationFiles([
      { name: "a.decisions.jsonl" },
      { name: "a.answers.tsv" },
      { name: "readme.md" },
    ]);
    expect(sorted.answers?.name).toBe("a.answers.tsv");
    expect(sorted.decisions?.name).toBe("a.decisions.jsonl");
    expect(sorted.unknown).toEqual(["readme.md"]);
  });

  it("knows when two files are from one simulation", () => {
    expect(sameSimulation("a.answers.tsv", "a.decisions.jsonl")).toBe(true);
    expect(sameSimulation("a.answers.tsv", "b.decisions.jsonl")).toBe(false);
  });
});
