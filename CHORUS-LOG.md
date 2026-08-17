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
a-methodological-caveat. **Deferred, named:** re-run this file through the
real eleven-agent Chorus when credits permit — this pass is a sequential
self-review and should not be cited as a full Chorus verdict.

**Postscript, same day — a silent-no-op caught by checking rather than
trusting.** The artifact regeneration that was supposed to follow Frankfurt's
fix did not happen: the driving loop used `set -- $c` over a
`for c in "menifee America/Los_Angeles"` list, and **zsh does not word-split
unquoted parameter expansions**, so all six invocations received one malformed
argument, printed the usage string, and exited 0. The wrapper reported
`REGEN_DONE`. Only the separately-run Glendale carried the fix; the other six
artifacts were stale, still missing `members`. Caught by asserting the
drill-down property across all seven outputs (`drill=True/False` per city)
instead of trusting the regeneration's own exit status — the same class of
defect this repo's own history keeps naming: **a failure that reads
downstream as an honest result.** (Cf. the 2026-08-12 run's silent API error
swallowing, and the DFR provenance doc's `LineString`-only geometry bug.)
An earlier draft of this very log entry asserted "all seven city artifacts
regenerated"; it was false when written and is corrected here rather than
quietly edited.

> **SUPERSEDED by the run below (2026-08-17b).** The deferral was taken up the
> same day. The real Chorus returned **33 findings where this pass found 5**,
> and Marshall **overturned five of this entry's verdicts** — including both
> clean verdicts that certified the two most serious defects in the file. Read
> this entry as the record of what a sequential self-review failed to see; do
> not cite its clean verdicts.

---

## Run: 2026-08-17b · commit: `HEAD` (`scripts/read-dfr-flights.mjs`, second pass)

The eleven-persona Chorus, run in parallel via Workflow as the skill
prescribes, against the same file the 2026-08-17 sequential self-review
passed. **33 findings from ten personas; Marshall struck 1 citation, raised 4
of his own, overturned 5 prior verdicts, and logged 7 recurrences.** The
headline is methodological: every one of the highest-severity defects sat
inside something the self-review had certified clean.

| Persona | Cell | Article | File:line | Verdict | Summary |
|---|---|---|---|---|---|
| Feynman / Diaconis / Dijkstra / Frankfurt | DEF, NUL, SEG, INS | CLAUDE.md "never tune a parameter"; II.10 1st consequence | header vs `:136` | **fixed** | **Four-persona convergence.** The header's "launch exclusion — ZERO tuned constants" was false of the code: `DOCK_EXCL_KM = 0.15` excludes a ~150 m disc (≈37 cells on the 45 m grid) by DISTANCE, so the header's frequency-dominance safety argument never runs and its "a shared destination can never be swallowed" guarantee fails inside the radius — a real recurring destination 120 m from a dock is invisible to that flight, and `dist_km` then goes missing not-at-random on exactly the flights nearest the dock. Fixed by naming every hand-set constant and flagging them calibrated-by-inspection, not measured. |
| Diaconis / Feynman / Dijkstra / Ostrom / Pearl | NUL, DEF, SEG, CON, EVA | II.10 2nd consequence ("selection is an axis") | `:308` | **fixed** | **Five-persona convergence.** E2 candidates are screened on co-arrival within WINDOW — the exact statistic `displacementNull` then tests — so every candidate reached the null with `observed >= 1` by construction while the null's draws had no such condition: a best-of-n observation against a drawn-at-random null. Fixed with a screen-matched conditional p, `|{draws >= observed}| / |{draws >= 1}|`, from the null's own samples, plus a typed refusal when no draw clears the screen. **Changed results:** Nashville's 7 "ambiguous" pairs reclassified to `refused_no_admissible_ground` — their raw p of 0 had looked maximally significant when no admissible ground existed at all. |
| Diaconis / Ostrom | NUL, CON | II.10 3rd consequence | `:306-316` | **fixed (disclosure)** | With `DRAWS = 199` the finest non-zero p is 1/199 ≈ 0.0050, so `expected = p * n_candidates` (≈180–240) cannot fall below `ALPHA` for any non-zero p: the correction degenerated to "established iff p is exactly 0," and a p of exactly 0 multiplies to 0 for *any* family size, so a pair extreme by chance auto-establishes. Both halves now stated; p reported censored at `1/draws`, never as a measured zero. Raising DRAWS deliberately NOT done — choosing a draw count by its effect on these verdicts is the tuning CLAUDE.md forbids. |
| Diaconis | NUL | II.10 2nd consequence, vs `binding.js:199` | `:306-307` | **fixed** | Every candidate pair was nulled with the same constant `SEED = 42`, so pairs of equal shape received bit-identical permutation streams and their nulls were perfectly rank-correlated — while the family arithmetic treats the tests as exchangeable independent draws. The organ varies the seed per pair (`seed + aArrivals.length`); the driver now does too. Distinct from the shared seed *between* the two pool variants of one pair, which is required and retained. |
| Marshall | meta | II.10 1st consequence | `:308-319` | **fixed** | The declared-defective restricted pool governed every reported number about a *non-established* pair — `expected_null_count`, the ambiguous/independent boundary, the sort — while the corrected pool gated only `matter_established`. The reported expectation is now the more conservative of the two pools, so the known defect cannot flatter any verdict. |
| Frankfurt / Dijkstra | INS, SEG | II.21 (fabrication at altitude) | `:182` | **fixed** | `hour` was fed as `numeric`, whose kernel is linear \|a−b\|/IQR, but hour-of-day is CIRCULAR and this algebra has no circular kernel. 23:00 and 00:00 read as maximally distant, and `reify`'s mean turns a midnight-spanning week into a midday value no member is near — content at altitude and nowhere below it. Live for exactly the 24/7 programs in the panel. Field withheld: a missing kernel is a typed gap, not a licence to use the wrong one. |
| Marshall | meta | II.17 2nd consequence (`lens_cursor_undeclared`) | output block | **fixed** | The artifact declared no cursor and no extent — no source, no date range, no as-of — while every number depends on a single pull of a *live, growing* feed, and it is overwritten in place so successive runs are indistinguishable. Added `read_at` (host clock, III.2) and `feed` extent. |
| Holmes | SIG | II.2 | `:325-326` | **fixed (disclosure)** | **Recurrence against a claimed fix.** The prior pass asserted the exact-string citation identity "never merges two real matters into one." False: E1 unions every flight sharing a literal ≥6-digit token with no null and no refusal. Claim retracted in place; `e1_flights_per_citation_distribution` + `e1_largest_citations` now report the exposure per city rather than assuming it away. |
| Alexander / Ostrom | SYN, CON | II.21 | header | **fixed** | **Recurrence against a claimed fix.** The prior disclosure said the ladder finds week-kinds "that recur across weeks" — itself unmeasured. `reify` carries members and attributes but no week identity, so the upper induction cannot see which weeks its records came from and nothing measures recurrence. Withdrawn: two week-kinds sharing a label are two independent certifications that happen to share one. |
| Ostrom | CON | III.3 | `:322` | **fixed** | An uncitable flight can never be unioned, so it necessarily lands in a singleton — and counting those inside `n_matters` converts "cannot be grouped" into "is its own matter": an unknown reported as a measurement. Split into `n_matters_among_citable` vs `n_flights_uncitable`; for Denver (99.6% uncitable) the unpartitioned count is near-meaningless and now visibly so. |
| Feynman / Diaconis | DEF, NUL | IV.4 | `:314` | **fixed** | The `matter_established` verdict turned on an undeclared factor-3 p-ratio slack clause present in neither the header's declared block nor the emitted `declared` object; its only apparent provenance was an unrelated "2-3x FPR inflation" figure, a different quantity. Removed. |
| Simon / Chekhov | SEG·Network, residual | II.21 | `:385` | **fixed** | `eoread-<label>-kinds-full.json` was labelled "Full level-0 kind objects" but holds `fold.ladder[0].kinds` — kinds *of week-kinds*. Relabelled, with the empty-where-halted case named as a halt, not an empty run. |
| Chekhov | residual | IV.3 | `:140` | **fixed** | `r._home` assigned and never read — a dead write implying a per-flight dock record nothing consumes. Removed. |
| Dijkstra | SEG·Field/Link | II.17 | `:119` | **fixed** | `launch_sites` shipped a top-8 truncation of an undeclared 2% bar as though it were the program's site set, with an inline comment still documenting the withdrawn 0.5% rule. Bar and cap named as display-only; `n_above_bar` and a `truncated` flag emitted. |
| Simon | SEG·Network | CLAUDE.md "reconcile them — don't just dedupe" | `binding.js:151-153` | **deferred-with-reason (ESCALATED — this is the named incident, live)** | The restricted-pool defect is corrected only in this driver's private copy. Checking the organ while logging this made the finding sharper than Simon stated it: **`reversalNull` was already fixed on this very branch** (`fae1e6b`, 2026-08-15) and carries a 12-line comment explaining why excluding A's positions draws the null from a strictly smaller space than the observation, with measured FPR numbers — while **`displacementNull`, its sibling forty lines up in the same file, still reads `if (!aSet.has(p))`** and still documents that exclusion as intended. This is not an abstract debt; it is precisely the incident CLAUDE.md's third rule is named for ("Deduplication that preserves a known bug in one copy while fixing it in the other is not finished"), sitting unrepaired in the file where the repair was written. Deferred out of THIS commit only because `displacementNull` feeds `bindLinks` and thus the graph/terrain organs, so the fix moves numbers well outside a driver's blast radius and must land with its own conformance run — which CLAUDE.md explicitly permits ("fixing a shared bug underneath it is still correct, but say so explicitly and expect the pinned number to move"). **Next commit in this repo, not a someday item.** |
| Dijkstra | SEG·Field/Link | II.10 / III.3 | `:182` | **struck** | Marshall: **citation struck, not the defect.** The circular-`hour` finding cited II.10 and III.3 and neither says what it claims — II.10's subject is a null against an observation, and its "extent, spec, n, direction" sentence is about the ground's commensurability, not a field's kernel. The defect is real and is fixed above on Frankfurt's II.21 grounds, which do hold. |

**Marshall's audit of the 2026-08-17 self-review** — 5 overturned, 1
unverifiable, 6 upheld:

- **OVERTURNED** — Feynman clean, "the launch exclusion carries zero tuned constants": false against the file at the same commit, and the load-bearing failure of that pass.
- **OVERTURNED** — Diaconis clean, "an expected-count over the *selected* candidate set": the word *selected* was precisely the defect the verdict passed over.
- **OVERTURNED** — Diaconis clean, "the one known bias is declared and cross-checked": the cross-check did not govern the reported statistic, and a robustness argument scoped to the pool bias cannot license a clean verdict on multiplicity.
- **OVERTURNED** — Holmes fixed, "runs conservative, never merges two real matters": the claimed fix shipped a false statement about the code.
- **OVERTURNED (in part)** — Dijkstra clean, "positions used exactly as `bindLinks` does": the window-units half is true; the parity claim is not — the organ varies the seed per pair and the driver did not.
- **UNVERIFIABLE** — Simon clean, citing `portable_profile.py`: no such file under the searched roots, and the entry gave no path. It lives in the sibling analysis repo's `scripts/`, outside `eoreader6`. **Future entries citing a file outside this repo must give its path.**
- **UPHELD** — Alexander (fold limit named), Frankfurt (drill-down members), Chekhov (`KIND_SAMPLE` removed), Pearl (shared seed as matched counterfactual, strictly scoped), Ostrom (unfoldable weeks reported), and Marshall's own scoped clean-with-caveat — which Marshall notes is "vindicated rather than merely honest," since what a self-review structurally cannot check is the factual content of its own clean verdicts.

**Raised against the constitution itself, not this file (IV.1, for a human to
dispose per IV.2):** Article II has no body text for II.13–II.16 or
II.18–II.20, though the amendment log ratifies the 8th (II.13), 9th (II.14)
and 11th (II.16), and other articles cross-reference them as readable. The
2026-08-12 Chorus entry already shipped a verdict citing **II.19**, an article
with no text to check. Agents propose, humans dispose — surfaced, not edited.

**Net**: 13 fixes (4 of them changing results or verdict logic, not prose),
1 deferred-with-reason now properly recorded, 1 citation struck with its
defect surviving on other grounds, 1 constitutional gap referred to a human.
All seven city artifacts regenerated and re-verified. **The activation rule
bit this run:** two findings were recurrences against fixes the previous pass
claimed, and both were caused by the fix text itself asserting something
unmeasured — the specific failure mode of a reviewer grading its own work.

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
