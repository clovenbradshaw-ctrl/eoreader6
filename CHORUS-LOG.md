# Chorus Log

Append-only record of `chorus-lint` runs. One entry per persona per run,
each citing a real constitution article and a real file:line. See
`eo-constitution/CONSTITUTION.md` for the articles, and the `chorus-lint`
skill for the discipline. Newest run at the top.

---

## Run: 2026-08-12 · commit: `HEAD` (this commit, `packages/engine/perceiver/text/relations.js` A19 diff)

Reviewed diff: `perceiver/text/relations.js`'s object-bound + subject-strip
rewrite (A19) plus its caller sweep, against the diff described in
`READING-POLICY.md` A18/A19. Ten personas, run in parallel via Workflow.

| Persona | Cell | Article | File:line | Verdict | Summary |
|---|---|---|---|---|---|
| Diaconis | NUL | II.10 | `relations.js:280-284,307` (pre-fix) | **fixed** | `SPLITTER` (bare `.+?`, no dotAll) re-derived the triple from `m[0]` independently of `MATCHER`'s own capture groups; diverged once the object group could span a newline, corrupting a real record in `goldens/agency-civic/data/engine-scores.json` (id `ordinance-metro-ord-25-1528-preamble-s0-c9`) and, at scale, silently dropping far more matches than it corrupted. Fixed by deleting `SPLITTER` and reading `m[1]`/`m[2]`/`m[3]` directly. |
| Feynman | DEF | (jurisdiction: golden-tuning) | — | **clean** | No evidence any bound was tuned by iterating against `goldens/agency-civic`'s score; the winning object-bound was selected on an independent full-novel measurement first, and the subject-fix's own disclosed net-zero-on-the-golden result is the opposite of tuning-to-pass. |
| Dijkstra | SEG·Field/Link | III.3 | `relations.js:290-295` (pre-fix) | **fixed** | Narrowing the object capture also narrowed what `previousMatchEnd` (A18's clause-boundary signal) considered claimed, letting a trailing negation word bleed into the NEXT relation's polarity window — reproduced fabricating a negative polarity on an affirmative clause. Fixed with a new `clauseEndAfter` helper that finds the true clause terminator independent of the (now narrower) object capture. |
| Dijkstra | SEG·Field/Link | III.3 | `relations.js:320-324` (pre-fix) | **fixed** | Subject-strip checked only the first token's function-word-ness; "does not measure" stripped "does" and left "not" standing in as the fabricated subject. Fixed: refuse to strip when the remaining token is itself in `NEGATION_WORDS`. |
| Simon | SEG·Network | IV.3 | 4 files (see below) | **deferred-with-reason** | `scripts/adversarial/challenge-9-*.mjs`, `challenge-10-*.mjs`, `challenge-4-*.mjs`, `scripts/experiments/role-fold-kinds.mjs` each already compute `functionWords` in scope and don't thread it to `extractRelations`/`createSinger` — the same oversight fixed in six sibling scripts. Not swept this pass (adversarial/experiment scripts, lower priority than production paths); named explicitly in READING-POLICY.md A19 rather than silently omitted from the caller-sweep accounting. Opt-in design means nothing is broken by the omission. |
| Frankfurt | INS | III.3 | `relations.js:280-283` interacting with `337-353` (pre-fix) | **fixed** | Same root cause as Dijkstra's first finding, independently reproduced with a different constructed sentence. Same fix (`clauseEndAfter`). |
| Ostrom | CON | II.10 | `relations.js:256` (pre-fix docstring) | **fixed** | The docstring's "every genre improved, none regressed" was earned by the object mechanism alone but read as a property of the single `functionWords` flag that ships both mechanisms. Fixed by not repeating an unqualified golden number in the docstring; READING-POLICY.md A19 keeps object and subject validations reported separately. |
| Holmes | SIG | II.2 / II.8 | `relations.js:320-324` and `packages/host/sing.js:157` | **fixed** | Subject-strip is a coreference decision under syntax framing — "his King"/"her King" both stripped to bare "King", and for `sing.js` (no referent-resolution seam of its own) the stripped string IS the belief-graph node id, so two distinct people could silently merge into one node. Fixed: refuse to strip when the leading token is in `THIRD_PERSON_SINGULAR` (existing named prior, `priors.js`, giver `lang/en`) — a possessive pronoun carries identity information a plain determiner/conjunction doesn't. |
| Pearl | EVA | II.19 | `relations.js:252-256` (pre-fix docstring) | **deferred-with-reason** | The pg2600 measurement and the `goldens/agency-civic` validation both depend on the same `material.js::functionWordSet` primitive at the same fixed threshold, so they aren't fully independent corroboration — the repo's own documented "Meadows" case proves the shared cause can move both together. Not separately re-validated against an independent function-word derivation this pass (would require a second, differently-calibrated primitive, out of scope for this fix); named honestly in A19 rather than claimed as independent confirmation. |
| Alexander | SYN | II.7 | `relations.js:290-295,347-353` interacting with `280-283` (pre-fix) | **fixed** | Third independent reproduction of the same `previousMatchEnd`/object-truncation interaction as Dijkstra and Frankfurt, via a distinct constructed sentence. Same fix (`clauseEndAfter`). |
| Chekhov | residual | IV.3 | `role-fold-kinds.mjs:66`, `challenge-4-*.mjs:104-107,129` | **deferred-with-reason** | Same finding as Simon's, from the dead-code/unwired-organ angle; `challenge-4`'s own header claims production-path parity with `sing-book.mjs`, which is presently false. Deferred alongside Simon's finding — named in A19. |

**Net**: 6 findings fixed (Diaconis 1, Dijkstra 2, Frankfurt 1 — same root
cause as one Dijkstra finding — Ostrom 1, Holmes 1, Alexander 1 — same root
cause as the other Dijkstra/Frankfurt finding); 2 deferred-with-reason
(Simon/Chekhov's caller-sweep gap, Pearl's shared-primitive corroboration
caveat), both named explicitly in `READING-POLICY.md` A19 rather than
hidden; 2 clean (Feynman, and the parts of every other persona's jurisdiction
not covered by a filed finding). All numbers in A18/A19 were re-measured
against the post-fix code before this run's findings were treated as
resolved.
