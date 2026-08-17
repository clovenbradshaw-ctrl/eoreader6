# Chorus Log

Append-only record of `chorus-lint` runs. One entry per persona per run,
each citing a real constitution article and a real file:line. See
`eo-constitution/CONSTITUTION.md` for the articles, and the `chorus-lint`
skill for the discipline. Newest run at the top.

---

## Run: 2026-08-17 · commit: `HEAD` (new file `scripts/read-dfr-flights.mjs`)

Reviewed diff: one new script — a driver reading police DFR (drone-as-first-
responder) public flight feeds through `induceKinds` / `reify` / `foldHolons`
and `displacementNull`, across seven programs. **Run sequentially by the
session, not via Workflow**: the eleven-persona parallel run was launched and
all eleven agents died on usage credits before producing any output
(0 tokens spent, 11/11 error) — the skill's stated fallback ("run the ten
checks sequentially yourself rather than skipping the multi-perspective
structure") was taken. Recorded here because a single reviewer holding ten
lenses is a weaker instrument than ten independent ones, and the next run on
this file should not assume this pass had the full Chorus's resolution.

| Persona | Cell | Article | File:line | Verdict | Summary |
|---|---|---|---|---|---|
| Alexander | SYN | II.21 | `read-dfr-flights.mjs:18-31` (header, pre-fix) | **fixed** | The sideways-per-week fold was documented as a speed win with no statement of what it costs. It is *not* equivalent to inducing over the whole population: a diffuse kind (≈2 flights/week sustained for a year) is certified by no single week, is therefore never reified, and cannot appear at any altitude. Shipping it as "the fold used correctly" without that limit is a completeness overclaim of exactly the shape II.21/II.14 refuse. Fixed by naming the limit in the header — what the ladder finds is "kinds visible within a week that recur across weeks," never "kinds of the year." |
| Frankfurt | INS | II.21 | `read-dfr-flights.mjs:~300` output block (pre-fix) | **fixed** | Week-level and upper-ladder kinds were serialized with `label` and `size` only — `members` dropped. At altitude the artifact asserted a kind with no path back to the flights beneath it: "a fold that cannot be drilled back down has not folded; it has fabricated a figure." Fixed by carrying `id` + `members` at every level (week-kind members are flight_ids; L1 members are week-kind ids resolvable against `week_level`), verified on Glendale: L0 kind `weekday=Thu` → 3 flight_ids. All seven city artifacts regenerated. |
| Chekhov | residual | IV.3 | `read-dfr-flights.mjs:60-65` (pre-fix) | **fixed** | `KIND_SAMPLE` and its `kindSampleArg` positional survived the switch from subsampling to the holonic fold — parsed, documented in the usage string, referenced nowhere. An unwired option that silently accepts and ignores a 5th argument. Removed, usage string corrected. |
| Pearl | EVA | II.10 | `read-dfr-flights.mjs:~200` | **fixed (documentation)** | The shipped and unrestricted-pool `displacementNull` runs share `seed`, `window`, and both arrival streams. Not a violation — it is the II.10 matched counterfactual, differing in exactly the one axis under test (the pool) — but undocumented it invites a future reviewer to "fix" the shared seed and destroy the comparison, and invites the stronger claim that the two agreeing constitutes independent corroboration. It does not: they share every cause but one. Both facts now stated at the call site. |
| Holmes | SIG | II.2 | `read-dfr-flights.mjs:~130` | **fixed (documentation)** | Citation identity is exact-string-after-trim/split, so two spellings of one case number read as two citations and split a matter that is really one. Left as-is deliberately: the error runs conservative (never merges two real matters), and normalizing spellings would derive who-denotes-what from surface shape — the giver test's own refusal. Disclosed at the definition rather than silently normalized. |
| Diaconis | NUL | II.10 | — | **clean** | The E2 window is measured from the feed's own ground-truth-positive class (p95 of same-citation relaunch gaps), not hand-set; refused outright where too few relaunches exist to measure one (Glendale, Denver, Menifee return a typed refusal, not a number). Multiple comparison is carried as an expected-count over the selected candidate set. The one known bias (restricted pool) is declared in the header and cross-checked, and it runs anticonservative — so the zero-established result is robust to it. |
| Feynman | DEF | (jurisdiction: golden-tuning) | — | **clean** | No threshold in the file was selected by checking its effect on an outcome. The ≥6-digit CAD gate is justified by a failure it prevents (56,518 spurious LAPD shared-citation pairs from bare "TEST" strings), the launch exclusion carries zero tuned constants after the 0.5%-share draft was withdrawn, and the induceKinds opts are inherited unchanged from `read-kinds-networked.mjs` rather than fitted here. |
| Dijkstra | SEG·Field/Link | II.10 / III.2 | — | **clean** | Flight-order positions are used as the reach unit for co-arrival exactly as `bindLinks` uses arrival positions in a text, and the window is measured in those same units. Esri part-order is respected (within-part sums only, inherited from the reducer); endpoint cells are treated as an unordered bag, never directionally. Clock and I/O live in the script (a host), not in an organ — III.2 constrains the engine, not its drivers. |
| Simon | SEG·Network | IV.3 | — | **clean** | The python `portable_profile.py` computes an overlapping but separately-scoped set of descriptives; it is retained explicitly as a cross-check, not as a second implementation of the same organ, and no downstream consumer reads it as authoritative. Nothing in this diff makes an unverified thing a dependency. |
| Ostrom | CON | II.5 | — | **clean** | Weeks below `minKindSize` are counted and reported (`records_in_unfoldable_weeks`), never silently dropped; "no kinds certified this week" and "this week had too few records to ask" stay distinguishable in the artifact. Matter union-find is scoped to the flight population it was computed from. |
| Marshall | meta | IV.4 / II.12 | — | **clean, with one note** | No amendment content in the diff; the file self-enacts no law. Runs entirely on local compute (II.12). Every finding above cites an article whose text says what the finding claims. **Note for the record:** this pass had no independent Marshall — the same session produced and checked the findings, so the citation-conformity check is self-review, which is precisely the check Marshall exists to not be. Flagged as a known weakness of this run, not papered over. |

**Net**: 3 substantive fixes (Alexander's undisclosed fold limit, Frankfurt's
missing drill-down path, Chekhov's dead option), 2 documentation fixes that
prevent a future correct-thing-broken (Pearl, Holmes), 5 clean, 1 clean-with-
a-methodological-caveat. All seven city artifacts regenerated after the
drill-down fix. **Deferred, named:** re-run this file through the real
eleven-agent Chorus when credits permit — this pass is a sequential
self-review and should not be cited as a full Chorus verdict.

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
