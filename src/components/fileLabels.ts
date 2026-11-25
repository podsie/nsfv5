import { ANSWERS_SUFFIX, DECISIONS_SUFFIX } from "../data/simulationFiles";

export const FILE_LABELS = {
  title: "Open your files",
  hint: "You can also drag both files onto this page.",
  notice:
    "This page does all processing locally and does not upload any files.",
  answers: {
    name: "Answers file",
    suffix: ANSWERS_SUFFIX,
    choose: "Choose file",
    another: "Open another",
    accept: ".tsv,.txt,text/tab-separated-values",
  },
  decisions: {
    name: "Decisions file",
    note: "optional",
    suffix: DECISIONS_SUFFIX,
    choose: "Choose file",
    another: "Open another",
    accept: ".jsonl,.json,.ndjson",
  },
  continue: "Continue",
  none: "No file",
  reading: (fileName: string, fraction: number) =>
    `Reading ${fileName} (${Math.round(fraction * 100)}%)`,
  unknown: (names: string[]) =>
    `Unrecognized: ${names.join(", ")}. File names must end in ${ANSWERS_SUFFIX} or ${DECISIONS_SUFFIX}.`,
  mismatch: (answers: string, decisions: string) =>
    `These files have different names: ${answers} and ${decisions}.`,
};
