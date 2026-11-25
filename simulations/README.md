# Simulations

Download the files from the releases: https://github.com/podsie/nsfv5/releases

One folder for each date. Each run has two files with the same name: `<name>.answers.tsv` and `<name>.decisions.jsonl`.

## 2026-11-25

| Pair | Answers | Decisions | What it is |
| --- | --- | --- | --- |
| `one-attempt-18-weeks` | 509 MB, 1,216,977 rows | 1 GB, 116 traced students | 29 courses, 50 classes, 1,271 students. 18 study weeks, then two post tests. A student answers each item of an assignment once |

The students are synthetic. They come from the Podsie simulation (`scripts/nsfv5-simulation`), seed `nsfv5-sim-1`.

| Rule | Value |
| --- | --- |
| Optimal pick | The probability closest to 0.85, above it or below it, while one item is below 0.85. The last 5 served are left out |
| First post test | The teacher's questions for every student, with the student's massed items added until there are 10 |
| Second post test | The same items for each student, 2 to 4 weeks after the first |
