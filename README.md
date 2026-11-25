# NSFv5 data explorer

A page that opens the files of one NSFv5 simulation or export. The files stay on the computer that opens them. The page sends nothing to a server.

## The two files

Each simulation run has two files that share a name.

| File | Name ends in | Contents | Needed |
| --- | --- | --- | --- |
| Answers file | `.answers.tsv` | The DataShop export. One row for each answer | Yes |
| Decisions file | `.decisions.jsonl` | What each review pick read and chose, for the traced students. One review session on each line | No. It adds the chart and the pick decisions |

The start page has a button for each file. You can also drag both onto the page, and the page sorts them by name. The page header shows a warning when the two open files have different names.

## Where the simulation files are

`simulations/` has one folder for each date, and each folder has the pairs of that date.

```
simulations/
  2026-11-25/
    one-attempt-18-weeks.answers.tsv
    one-attempt-18-weeks.decisions.jsonl
```

`simulations/README.md` says what each pair is.

Git does not hold these files. The pair is 509 MB and 1 GB, and GitHub refuses a file over 100 MB.

- Open question: where to download the simulation files from. The files are only on the computer that ran the simulation.

Put downloaded pairs in `simulations/<date>/` with the names above.

## Use the GitHub page with downloaded files

1. Open https://podsie.github.io/nsfv5/.
2. Choose the `.answers.tsv` file and the `.decisions.jsonl` file of one run, or drag both onto the page.
3. To change a file later, use "Open another" beside its name in the page header.

The page reads both files from the disk of the computer. It does not upload them.

To publish the site, push to `main` with GitHub Pages set to "GitHub Actions" in the repository settings. `.github/workflows/pages.yml` runs the tests, builds the site, and publishes it. The built site uses relative addresses, so it works under any repository name.

## Run the site on this computer

Install once:

```bash
npm install
```

As one file, with no server. `npm run build` writes `dist/index.html`, which has the whole site inside it:

```bash
npm run build
```

Open `dist/index.html` with a double-click, and choose the two files. The file works from any folder, so you can send it to a person who does not have Node. GitHub Pages serves the same file.

As a dev server that opens one simulation at start:

```bash
SIMULATION=2026-11-25/one-attempt-18-weeks npm run dev
```

`SIMULATION` is the date folder and the pair's name. To open files from another place, name each one:

```bash
TSV=/path/to/file.tsv DECISIONS=/path/to/file.jsonl npm run dev
```

## Decisions file

Write a decisions file from the Podsie repository:

```bash
npx tsx scripts/nsfv5-export/exportPickTraces.ts <database url> <name>.decisions.jsonl [course id...]
```

The file's first line has the Optimal model's parameters and its target probability. "Model parameters" in the page header shows them.

A student and a session with saved picks show a "Decisions" badge. In a session, select an answer to see the decision that picked its question: the massed slot check, and every candidate of SM2 or Optimal with the chosen one marked. A pick joins its answer by enrollment id, session id, and CF (Session Position).

A student and a session with saved picks also show a chart. The chart has one column for each answer, in time order. A student's chart has the assignments, the review sessions, and the two post tests. A session's chart has that session only.

| Part | Meaning |
| --- | --- |
| Green shaded block | The answers of an assignment or a post test, with its date above |
| Unshaded block | The picks of a review session, with its date above |
| "Result" row | A green dot for a correct answer and a red dot for an incorrect one, for every column |
| Line | One candidate question across the review picks |
| Dark dot | The item that the algorithm chose. It is drawn last, so nothing covers it |
| Blue dot | A pick of the massed item, on the "Massed" row |
| Grey dot | A candidate that the pick did not choose. The switch under the chart shows them |
| Orange dot | A candidate that was held back: one of the last 5 served for Optimal, or the question served last for SM2 |
| "Massed" row | A pick of the massed question |
| "Unseen" row | An SM2 pick of a question with no card |

| Condition | Vertical scale | Dashed line |
| --- | --- | --- |
| Optimal | The probability of a correct answer when the pick ran | The target probability |
| SM2 | The days from the card's due date to the pick | The due date |

Point at a column to mark every answer on the same question and the question's line. That shows the assignment answer that introduced a question, and each later review of it. Select a review pick to see its decision.

A question's line breaks where a pick did not have the question as a candidate. SM2 lists only the cards that are due and the cards missed in the session, so a card's line ends when the student answers it right.

A pick takes its result from the session's next answer on the same item in the TSV. An item is the value of CF (Question Container Id).

## Pages

| Page | Content |
| --- | --- |
| Summary | Students and answers by condition. Percent correct by phase and by review study week, for each condition and each value of the second Condition Name column. |
| Study rules | Each study rule, tested on every student. "Show sessions" lists the sessions that break a rule. |
| Students and sessions | Course, class, student, and session. A session shows its answers in order. An answer shows every column. |

## Unfinished assignments

The export has no row for a question that a student did not answer. An assignment session id names the class's copy of an assignment, so the explorer takes the assignment's questions to be every item that any student of the class answered in it. A student did not finish an assignment when one of those has no answer from them. The session shows the count ("1 of 4 questions") and the containers with no answer. "Only unfinished assignments" filters the tree.

Limits:

- The export has multiple choice answers only, so the count covers multiple choice questions only.
- A question that no student of the class answered is not counted.

## Post tests

The export has two post test phases, `posttest1` and `posttest2`. A student's post test has every question of the teacher's post test, and their own massed questions added until it has 10 of them. Two cases follow from that, and the explorer marks both as notices:

- A student who missed assignments or reviews gets post test questions they never answered before. The Study rules page reports this per enrollment: how many enrollments have such questions, and the minimum, median, mean, and maximum number of them. A question counts once per enrollment, across both post tests. The student's page shows the enrollment's count and the items.
- A student who saw fewer than 10 massed questions in review has fewer than 10 in their post tests. The session shows how many massed questions the student answered in review.

The export has a row only for an answered question, so a post test that a student did not finish also shows fewer massed answers.

## Study rules

The study has 18 weeks of assignments and review. One notice reports the enrollments with review answers in fewer than 18 of them, and the minimum, median, mean, and maximum number of weeks. A week counts when the enrollment has at least one review answer in it. The export does not say whether a session met its minimums.

| Rule | Kind |
| --- | --- |
| A student has one condition | Fail |
| Review questions are picked by the algorithm of the student's condition | Fail |
| A massed question is answered at most 5 times | Fail |
| A massed question is massed in only one session | Fail |
| The algorithm never picks the student's massed question | Fail |
| A student has one massed session per study week | Fail |
| A student answers each item of an assignment once | Fail |
| A student answers each question of a post test once | Fail |
| Every answer has a start time | Fail |
| Massed questions answered fewer than 5 times | Notice |
| Post test questions the student never answered in an assignment or a review | Notice |
| Students with fewer than 10 massed questions in their post tests | Notice |
| Students who reviewed in fewer than 18 study weeks | Notice |
| Answers that took over one hour | Notice |

The rules are in `src/data/checks.ts`.

## Size

The loader reads the file as a stream and keeps one small record for each row. It reads a row's text again from the file when you open a session. A 261 MB file with 625,868 rows loads in about 2 seconds.

## Checks

```bash
npm run typecheck
npm test
```

`.gitignore` excludes `*.tsv`, `*.jsonl`, and `data/`. Do not commit an export.
