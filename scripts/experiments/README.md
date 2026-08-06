# Role-fold experiments

**EXPERIMENTAL. Unwired. Not a golden, not a certified organ.** Under the
growth rule (IV.3 in `eo-constitution`), nothing here has earned a place in
`packages/engine` — these are measurement scripts, same footing as
`scripts/predictor-scientist.mjs` and the other `generation/RESULTS.md`
experiments, kept until they either graduate or get refuted.

## The question

Does `induceKinds` (`packages/engine/emergence/kinds.js` — already built for
clustering relation-term records by shared structural attributes, profile-
Jaccard + two Born gates, height discovered) recover real structural classes
when pointed at fold-positions instead of relation terms — i.e., can a
"role" (agent-shaped, patient-shaped, whatever a human ends up calling it)
be *discovered* from recurrence across a text pocket, rather than declared
via a hand-typed grammar?

Follows directly from `goldens/agency-civic/`'s finding that
`perceiver/text/relations.js::extractRelations`'s SVO regex — the mouth's
word-order prior — has 87% recall loss against real clause-level agency
judgments. The question here is whether a discovery-based alternative can
do better without reintroducing a hand-typed grammar by another route.

## The arc, in order, each one a correction of a defect found by running the last

1. **`role-fold-kinds.mjs`** — first pass. Reused `extractRelations` itself
   as the candidate-filler generator. Worked end-to-end, but silently
   imported the SVO regex's own word-order requirement into what was
   supposed to be a discovery mechanism — visible only in noisy output
   (discourse markers and citation fragments admitted as false "subject"/
   "object" fillers). This defect is drafted as
   `eo-constitution/AMENDMENT-12-PROPOSAL.md`, the signal-preservation test.

2. **`role-fold-kinds-v2.mjs`** — order kept as a *measured feature*
   (signed distance-bucket from a discovered verb occurrence), never as a
   hard requirement or a pre-assigned subject/object label. Fixed the
   overcorrection risk (dropping order-sensitivity entirely would have
   discarded a different real signal — order does correlate with role in
   English).

3. **`role-fold-kinds-nest.mjs`** — recursive re-clustering inside each
   surviving kind's own members, asking whether structure nests. Found
   none at the scales tested — and, more precisely, found that the root
   clusters themselves never certified `height=above`, only `unstable`
   (existence-dependency and possibility-constraint disagreeing), at every
   scale tried (40 and 150 pocket documents, position-only and
   position+verb-identity attribute profiles).

4. **`role-fold-kinds-v3.mjs`** — pooled function-word derivation across
   the whole pocket (a single document's Zipf curve doesn't have the
   volume to separate mid-frequency closed-class words), plus a disclosed,
   received English function-word list layered on top (II.2 — a small
   closed-class set is a legitimate received prior with a named giver, not
   something the engine must mine for itself). Cleaned the noise
   substantially. Height was still `unstable` at every scale tried.

5. **`role-fold-verb-island.mjs`** — the turning point. Every previous
   script pooled candidate fillers across hundreds or thousands of
   distinct discovered verbs before ever clustering — asking for cross-verb
   abstraction from the start. Usage-based acquisition research (Tomasello:
   children have per-verb frames — *cutter/cuttee* for "cut," separately for
   "draw" — long before anything general; abstraction is slow accumulation
   across items, not a switch) says that's the wrong order to ask the
   question in. Restricted each `induceKinds` call to ONE frequent verb's
   own fillers at a time. Nearly every verb island reached `height=above`
   immediately — real structure (BIA, EPA, FAA, Commission, Department
   recurring as `"has"`'s near-before fillers; passive past-participles
   "accompanied/accredited/adopted/completed/defined" recurring immediately
   before `"by"`) where every pooled attempt had landed on `unstable`.
   Cross-island convergence (the same fillers recurring across ≥3
   independently-certified verb islands) is real but mixed — institutional
   actors (EPA, FDA, operator, applicant) alongside document/citation
   references (CFR, TSCA, AD) and generic modifiers (additional, certain,
   small) — the predicted limit of pure distributional clustering absent a
   grounding channel outside the text (Mintz 2003's frame-based category
   recovery works, but "groups by substitutability, not by ontology" —
   it will put people, horses, and cities in one bin without something
   external supplying the ontological split).

6. **`role-fold-tp-chunk.mjs`** — candidate fillers as variable-length,
   transitional-probability-bounded spans (Saffran, Aslin & Newport 1996;
   Aslin, Saffran & Newport 1998 — infants segment continuous speech with
   no grammar, using only the conditional probability of what follows
   what; a unit's edge is a local dip in that sequence, not a fixed width)
   instead of single tokens in a fixed window. Recovered genuine multi-word
   institutional/regulatory phrases no single-token method found
   ("Director of OWCP," "European Union Aviation Safety," "NIOSH-certified
   respirator," "certificate of documentation"). New failure mode found and
   partially fixed: URL/boilerplate fragments repeated verbatim across many
   documents have artificially high transitional probability (cohesion from
   copy-paste, not from grammar) and were chunking together as false
   "multiword" units — a shape-based filter catches most of these, not all.

7. **`resolve-span-role.mjs`** (a separate, open PR — see below) proved a
   span's role is a property of the *instance*, not the word: causal,
   one-hop, activation-gated collapse, a direct sibling to
   `perceiver/text/pronouns.js::resolvePronouns`, reusing
   `emergence/activation.js` unmodified. Its own registry, though, drew
   from only ONE saved experiment file and explicitly excluded multi-word
   members ("single tokens only for this pass").

8. **`span-role-reader.mjs`** — composes items 5–7 into one reading tool
   instead of three disconnected one-shot scripts, and widens
   `resolve-span-role.mjs`'s registry along the one axis it named as the
   next step: pools **both** `role-fold-verb-island.experiment.json` and
   `role-fold-tp-chunk.experiment.json`, and admits multi-word members.
   Two real defects surfaced by actually running the widened registry, not
   assumed in advance:
   - Classifying by a surviving KIND's own label (does it say "before" or
     "after"?) put every multi-word span at zero, because the ones that
     reached `height=above` clustered under a position-agnostic
     `"multiword"` label instead — "shares multiword" outscored position
     as a cohesion signal for these, at this evidence scale. Fixed by
     classifying each MEMBER by its own saved position-attribute counts
     (already computed and stored per-record, e.g. `"take place"` carries
     `pos:after_len2: 4`) instead of the kind's label — same measured
     data, finer grain.
   - `resolveSpanRole`'s own span DETECTION only ever scanned single
     tokens, which would make every multi-word registry entry structurally
     unreachable (present in the map, never once checked against a
     document's actual spans) — not a resolution failure, a detection gap.
     Fixed with a bounded sliding n-gram window; the causal
     activation-recall collapse itself is untouched. A self-check inside
     the script (a hand-built fixture, not a claim taken on faith) confirms
     a real multi-word registry entry is actually detected before trusting
     any real-document result.

   Run against 20 real US Code sections (`live_priors/06-government-legal/
   world-legislation/us` — a small, uncontested slice, chosen only to
   demonstrate the composed mechanism end to end): 590 unambiguous markers
   (55 multi-word) and 148 ambiguous targets (1 multi-word) in the widened
   registry, 1,488 instance-level resolutions, 47 words resolving to both
   kinds across different real instances. Zero of those resolutions were
   multi-word — not a detection failure (the self-check confirms
   detection works), but the registry's multi-word entries genuinely not
   recurring verbatim in this particular 20-document pocket, consistent
   with this arc's own prior finding that multi-word convergence is a
   higher bar than single-token convergence (item 5: only 2/69 convergent
   fillers were multi-word). A gap, reported as a result, same as
   everywhere else in this arc.

## The throughline

Every mechanism that reached `height=above` withheld abstraction until
item-level evidence earned it (verb islands before cross-verb pooling) and
gated admission on how many *distinct* things something co-occurred with,
never on raw repetition (type frequency drives productivity — Bybee — not
token frequency, which drives entrenchment of a specific item instead).
Every mechanism that stalled at `unstable` or produced noise imposed an
abstraction before checking whether the material supported it: SVO order as
a hard gate, a subject/object label assigned before any evidence, a fixed
token window instead of a measured boundary. Grammar as the compressed
*description* of a regularity discovered bottom-up, never as the mechanism
that finds it — usage-based acquisition research over generative parsing,
as the standing approach to how this engine reads, not just this session's
conclusion.

## Status

Not certified as anything. No claim here has been checked against a rotation
control, an inter-annotator ceiling, or a partial correlation the way
`goldens/agency-civic/` was — this is upstream of that discipline, still at
the "does any structure exist to certify" stage. `goldens/agency-civic/`'s
own firewall discipline (nothing outside a golden's own directory reads from
it, nothing here calibrates a production constant) applies here by the same
logic, informally, until any of this graduates to a real build.

Reproduce any script directly, e.g.:
```
node scripts/experiments/role-fold-verb-island.mjs <pocket-dir> [docLimit] [topNVerbs]
node scripts/experiments/role-fold-tp-chunk.mjs <pocket-dir> [docLimit] [topNVerbs]
node scripts/experiments/span-role-reader.mjs [pocket-dir] [docLimit]
```
Pocket used throughout items 1–7: `live_priors/06-government-legal/federal-register-fulltext`
(600 real US Federal Register Rule/Proposed-Rule/Notice documents, fetched
and disclosed in that repo's own commit history) — a sibling repo, not
committed here. `span-role-reader.mjs` (item 8) defaults instead to
`live_priors/06-government-legal/world-legislation/us` — a different, small,
uncontested slice of the same sibling repo, used only to demonstrate the
composed mechanism reading a real document end to end, not to make any
claim about corpus completeness or scale.
