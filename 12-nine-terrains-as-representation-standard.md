# 12 — The nine terrains as the nine representations of data

**Repo:** eoreader6 (this file, the record of the standard) + `eo-constitution`
(ratification record) + `writing-code-in-eo` SKILL.md (Layer 2 enrichment,
consuming repo).
**Status:** RATIFIED as a representation standard, 2026-08-14, by direction of
the project owner. **Not** an `eo-constitution` Article II amendment — nothing
here is a routing test, so Article IV.1's "an amendment updates the
enforcement tests in the same change" does not apply and no
`assay/classify.js` change accompanies it. See `eo-constitution/STANDARD-1-NINE-TERRAINS-REPRESENTATION.md`
for the cross-repo ratification note.
**Governs:** nothing in `packages/engine` — no organ, roster entry, or
conformance test changes with this document. It governs how data is
*represented* downstream of the engine: consumed by `writing-code-in-eo`
(Appendix A's neighbor, Layer 2 enrichment) and cross-referenced from
`CUBE.md`.
**Discipline:** the [canon] / [measured] / [proposed] tagging this document
uses throughout, checked against running code before filing; `CUBE.md`'s own
rule that an empty cell is a question, not a backlog item, extended here from
organs to representations.

---

## Wiring notes (added at ratification — read this first)

Two corrections made while filing the proposal as received, both substantive
enough to flag rather than quietly fix.

**1. Canon-of-record paths, corrected.** The proposal as drafted cited
`core/operators.js`, `core/faces.js`, `core/cube.js` as canon of record.
Those are the `eoreader4.1`/`eoreader4.2` *legacy* paths — per
`eo-constitution/CONSTITUTION.md` Article I.2, legacy is frozen reference and
nothing is ported from it; a legacy organ that hasn't been re-earned does not
exist for placement purposes. The live `eoreader6` equivalents, verified
against running code, are `packages/engine/operators.js` (`DOMAINS`,
`GRAINS`, `TERRAIN_BY_DOMAIN`, `cellOf`) and `CUBE.md` (the three-faces
scaffold — deliberately prose, not a data structure; see its own opening
line). §0–§7 below cite the live paths.

**2. "Significance" is not yet canon in the engine.** The proposal's original
§1 called "Identity/Interpretation" an informal label being retired in favor
of "Existence/Structure/Significance." That overstates the case in one
direction. `packages/engine/operators.js` freezes
`DOMAINS = ["Existence", "Structure", "Interpretation"]` — a literal,
load-bearing constant, keyed into `TERRAIN_BY_DOMAIN` and read by every
`cellOf()` call in the engine — and `SEED.md` has a numbered section built on
the word ("XXI — Interpretation was starved by Structure, not by itself").
That is not informal usage; it is the frozen, running canon of the engine
tier (Article I.1). "Significance" is the term the *application* layer
uses: `writing-code-in-eo` SKILL.md uses it throughout Layers 1, 2, and 4 —
and that document is itself marked "Version 0.2 (proposal)," not ratified
engine canon. `CUBE.md` already flags the two as naming the same axis
("the same axis... not an analogy to it") without picking a winner. This
document does not pick one either: **Interpretation** stays the engine-canon
name, **Significance** stays the application-layer name, and the two are
documented as aliases, not as a resolved rename. Unifying them lineage-wide
would mean renaming a frozen constant and roughly sixteen call sites across
`operators.js` and `SEED.md` — a real, separately-scoped change, not a side
effect of this one. (A smaller, third note in the same family: the proposal
also retired "Object" as an informal column label, but `writing-code-in-eo`
Layer 2 still uses "Object" today as the formal name of the grain-axis
*category* — "Mode (how), Domain (where), Object (what grain)" — distinct
from "Global," which this search found no live usage of anywhere. "Object"
isn't dead terminology either; it's a second live name for the same
category, same as grain/Object below.)

The `Object/Global` half of the original deprecation clause is otherwise
unaffected — `Ground/Figure/Pattern` is already the canonical `GRAINS`
constant with no competing *value* names found anywhere in the lineage; only
the axis-category label ("grain" vs. "Object") is doubled, not the three
terrain-column names themselves.

The rest of this document is the original proposal, filed as received, with
the grid, connections, and corollary laws checked against `operators.js` and
`CUBE.md` and found to match.

---

## 0. The claim being standardized

"Nine terrains, nine ways to represent any data" is made precise as: every
representation has a native terrain — the one Site-face cell its structure is
built to hold — and that catalog is closed at nine. A spreadsheet, a graph, a
legend, and an EKG strip aren't four arbitrary UI choices; they're four
terrains wearing pixels. Real surfaces are composites (a dashboard is many);
the claim is that the atoms are nine and every composite decomposes into
them, forced the way the nine operators are forced. [proposed]

## 1. The canonical grid [canon]

|                 | Ground      | Figure  | Pattern  |
|-----------------|-------------|---------|----------|
| **Existence**   | Void        | Entity  | Kind     |
| **Structure**   | Field       | Link    | Network  |
| **Significance**\* | Atmosphere  | Lens    | Paradigm |

\* Third-row axis name: **Significance** here and in `writing-code-in-eo`
(Layers 1, 2, 4); the identical axis is named **Interpretation** in
`eoreader6/packages/engine/operators.js` (`DOMAINS`, frozen) and throughout
`SEED.md`. Both are live, current usage in different tiers — see Wiring
notes above, point 2.

Rows are Domains (Existence = whether things are; Structure = how they
connect; Significance/Interpretation = what they mean). Columns are grain
(Ground = ambient substrate; Figure = one individuated thing; Pattern =
recurring structure over Figures). A representation's native terrain is one
cell: pick the Domain it's about, then the grain it holds.

Deprecation: the informal row label "Identity" (for Existence) is retired;
"Existence" is unambiguous canon everywhere it's used (`operators.js`,
`CUBE.md`, `SEED.md`, `writing-code-in-eo`). The third row's name is *not*
fully deprecated to one term — see the footnote above and the Wiring notes.
The column labels "Ground/Figure/Pattern" were already sole canon (`GRAINS`
in `operators.js`); "Object" survives as a second, still-live name for the
*category* those three columns belong to, used in `writing-code-in-eo`
Layer 2 ("Domain by Object").

## 2. The nine terrains and their canonical surfaces

| Terrain (cell) | Canonical surface | Family | Blind to |
|---|---|---|---|
| **Void** — Ex·Ground | the empty frame: schema with no rows, coordinate plane before any mark, control-chart centerline | blank ledger, null curve, "no results" state | everything particular |
| **Entity** — Ex·Figure | the record: one spreadsheet row / DB tuple / index card / detail page | contact card, form response, log line | relation & type |
| **Kind** — Ex·Pattern | the taxonomy: category tree, pivot group-by, dendrogram, schema-as-type | legend, facet list, histogram bins | the individual |
| **Field** — St·Ground | the raw layout: page scan, map tile, flowed doc, hex dump, raster | document viewer, tiled map background | named relations |
| **Link** — St·Figure | the edge: one citation, hyperlink, foreign key, ER arrow, join row | cross-reference, "related to" chip | the whole |
| **Network** — St·Pattern | the node-link graph: Gephi, org chart, citation net, adjacency matrix | sankey, chord, subway map | the moment & individual salience‡ |
| **Atmosphere** — Sig·Ground | the trace with a moving baseline†: EKG strip, ticker, sparkline, running feed | activity stream, live log tail | fixed reference (it re-zeros)† |
| **Lens** — Sig·Figure | the saved view: SQL VIEW, dashboard filter, camera preset, a chart-as-argument | pinned report, annotated figure, diagnosis panel | its own contingency |
| **Paradigm** — Sig·Pattern | the legend / ontology / style guide; a governing doc like the constitution | coding frame, controlled vocabulary | what it excludes |

Build laws worth carrying forward [measured] (against `CUBE.md` and
`eoreader6/11-terrain-occupancy-and-the-two-ascents.md`): Void is the shared
null every terrain calls fresh (a service, not a product). Entity is born
only from recurring consequence clearing a void-mask null — never
appearance. Kind clusters over relation terms, height discovered not
assigned. Field is pure byte-contiguity reassembly with no statistics — the
one terrain representable with zero inference. Link needs its endpoint
Entities first§. Network is a decaying belief graph (it forgets). Atmosphere
is literally the span between two re-zero events. Lens is a fold one tier up
from Atmosphere (the "n-many lenses off one log at one cursor" mechanism,
gated by `CONSTITUTION.md` II.17). Paradigm = induced Kinds + their core
Fields, and refuses stretches carrying none of its cores.

† ‡ § See §8 (2026-08-16 amendments) for the corrected wording and its
evidence — the cells above are left as originally filed, per this
document's own precedent of footnoting a needed correction rather than
silently rewriting filed text (compare the Domain-axis footnote in §1).

## 3. The connections

**Type A — grain ascent within a Domain** (Ground → Figure → Pattern).
Existence: Void→Entity→Kind. Structure: Field→Link→Network. Significance:
Atmosphere→Lens→Paradigm. This is the helix at terrain grain: no Figure
without a Ground null to clear it, no Pattern without Figures to recur over.
[measured]

**Type B — cross-Domain dependency** (Existence → Structure → Significance).
Four edges the engine actually builds, all sloping forward — verified
against `packages/engine/operators.js`'s roster and
`11-terrain-occupancy-and-the-two-ascents.md` §0: [measured]

- Link ← Entity (a Link needs admitted endpoints)
- Kind ← Link (`induceKinds` clusters over relation terms)
- Network ← Entity, Link (belief graph over both)
- Paradigm ← Kind, Field (induced Kinds + core Fields)

Net shape: Significance is downstream of Structure downstream of Existence.
Every cross-Domain arrow points forward; none point back. A
Significance-terrain surface with empty Existence/Structure under it is a
reading with nothing beneath it.

## 4. Corollary laws

See §8 for five laws added 2026-08-16, filed there rather than merged in
here so the original four stay exactly as ratified.

- **One native terrain per atom** (composites declare the union). [canon]
- **No terrain is a UI default** — choose from the data's home, not
  language's gravity toward Entity. [proposed]
- **The desert cell, in representation:** no surface may generate a Pattern
  terrain (Kind/Network/Paradigm) directly from a Ground terrain
  (Void/Field/Atmosphere) without a Figure mediating — you can't compose a
  Network straight from a Field. [proposed] (from the canonical SYN-at-Ground
  prohibition [canon], `CUBE.md`'s desert cell / `writing-code-in-eo`
  Layer 2's "the desert cell")
- **Grain must cohere across Act/Site/Stance** or the kernel rejects the
  event. [canon] (`writing-code-in-eo` Layer 2, "the coherence guard")
- **Cross-Domain claims carry their floor** — a Lens with no records/links
  under it is a Lens over Void. [proposed]

## 5. External validation — the nine subsume the classical taxonomies [proposed, cited]

The data-model tradition populates the Existence + Structure blocks (theory
of things and their connections): the relational model, developed by E.F.
Codd in 1970, represents data as tables → Entity (rows) + Kind (schema); the
hierarchical model, developed by IBM in 1968, organizes data in a tree →
Kind; the network model replaces the hierarchical tree with a graph,
allowing a record to have more than one parent → Network. The
Bertin–Wilkinson tradition is a theory of display landing on the
Ground/Figure rows plus all of Significance: Bertin's visual variables
include planar position, value, and hue (position→Field, value/hue as
wash→Atmosphere); texture-density is both selective and associative, ideal
for encoding categorical data → Kind; a grammar-of-graphics spec maps visual
variables (signifiers) onto data variables (signifieds) → a chart is one
Lens. Neither tradition alone spans the grid; the union does, with no cell
empty and no tenth demanded. That's external completeness evidence, not a
self-issued claim.

## 6. Honest gaps

The §2 surface exemplars are [proposed], not catalog canon — Appendix A of
`writing-code-in-eo` SKILL.md remains the authority on shipped contracts
(surface, `contract.terrains`, `contract.ops`, `contract.stances`,
renderer), and §2's "canonical surface" column is a broader, domain-neutral
catalog one level more general than Appendix A's ten shipped UI components;
the two are complementary, not competing, and Appendix A is not superseded
by this document. §0's "every composite decomposes" has no algorithm yet
— §8's census exercises one by hand on eighteen cases and finds none it
cannot run, but a hand-run census on eighteen cases is not the algorithm
this line asks for. §5 is subsumption, not a closure theorem of the kind
that backs the nine operators against Codd's algebra — **§8 (2026-08-16) is
a first pass at the representation-side proof this line called for**: a
falsification census against the closure claim specifically, six domains,
eighteen candidates, eleven adversarially judged, zero that fit no cell or
fit two natively. It is evidence toward closure, honestly short of a
theorem — one candidate (the null-arm banner, flagged by its own falsifier
as the sharpest of the batch) is still unjudged, the sweep is not
exhaustive by construction, and "no falsifier found an escape in one
round" is not the same claim as "no escape exists." And, entered at
ratification rather than in the original draft: the Significance/Interpretation
naming fork (Wiring notes, point 2) is itself an honest gap — this document
records it rather than resolving it, and a future proposal that actually
wants to unify the name engine-wide should cite this file as the place the
fork was first written down in one place.

## 7. Ratification hook

On acceptance, this fixes going forward: (a) the axis names, with the
Significance/Interpretation fork explicitly retained rather than silently
picked (Wiring notes); (b) one-native-terrain-per-atom; (c) the three §4
proposed laws; (d) deprecation of "Identity" as a row label and no further
deprecation of "Object" as a category label, since it remains live in
`writing-code-in-eo`. Each point is acceptable or refusable independently,
the way the ledger rules on organs one at a time.

## 8. Amendments from the closure census (2026-08-16) [proposed, cited]

Filed by direction of the project owner, from the consuming application
(`the-fold`, a chat instrument built on this repo's read organs). Method:
six independent sweeps hunted counterexamples to §0's closure claim from six
directions — statistical/scientific graphics, software interfaces, text &
narrative, time/space/body channels, machine-learning outputs, and the-fold's
own screens — surfacing 18 candidates, blind to each other's finds. The
strongest twelve went to a second, adversarial pass: a decomposer required to
try placing the candidate first, on the reasoning that a ratified standard
should not fall to a case that merely looks novel. Result: **zero escapes**
across the eleven judged before a session limit interrupted the twelfth
(the null-arm banner, held open — see §6). Every placement is either a
variety of an existing terrain or a composite the grid already predicts. But
six of those placements only held after showing the standard's own stated
"blind to" column was wrong about its own canonical surface, and those
corrections are what follows — evidence *for* closure, filed as amendments
because the wording that survived was not the wording that shipped.

Per this document's own precedent (Wiring notes), each correction is filed
as an addition with the original left in place and footnoted, not a silent
rewrite.

**8.1 Atmosphere's blindness is origin, not units.** "Blind to: fixed
reference (it re-zeros)" conflates scale with origin. The EKG's own inline
1 mV calibration pulse — canon exemplar, §2 — fixes *gain*, not zero:
clinicians read ST elevation against that same beat's PR-segment isoelectric
line, a reference re-derived locally, beat by beat, while the machine
high-pass filters baseline wander away by design. Corrected wording: "blind
to its own ORIGIN — the trace does not carry where zero is; the origin is
either re-derived from a recent window (a per-beat isoelectric line, a
session open) or imported from an attached Paradigm atom (a calibration
mark, a tidal datum). Not blind to units: gain and scale can be fixed by an
attached Paradigm without the Atmosphere gaining an origin." Canonical
surface wording corrected the same way: "the trace with a moving **origin**"
in place of "moving baseline" — a tide gauge's benchmark is re-levelled on a
~20-year epoch and looks fixed at any human timescale without being so; an
interval longer than the observer's horizon reads as absolute and is not
one.

**8.2 Network's blindness is exogenous salience, not all salience.** Any
centrality measure — degree, betweenness, closeness, eigenvector, PageRank —
is a function of adjacency alone and is invariant under graph automorphism:
two structurally interchangeable nodes get the same value regardless of what
they are. That is Network reading itself, not a second terrain, and §2
already lists sankey and chord (both encoding per-element magnitude
endogenously) as canonical Network family members, so this was never in
doubt for weighted edges — "Network is a decaying belief graph" already
implies weight. Corrected wording: "blind to the moment & EXOGENOUS
salience — a per-node or per-edge value that can differ between
automorphic nodes (a seed vector, a hand-set weight, an imported metric) is
not Network's own; the instant one is drawn as size or color, a Lens has
been folded over the Network and the composite must be declared." A plain
weighted adjacency matrix stays pure Network, no composite required.

**8.3 New corollary law — order declares its source.** Sequence is never a
terrain and never a third axis; every ordered surface must name which of
four places its order lives in: *positional* (Field adjacency — byte- or
spatial contiguity is order, and Field is the terrain made of nothing else);
*ordinal* (an attribute the Entities themselves already carry); *constraining*
(a Link/Network precedence chain whose linearization is chosen, not given);
or *presentational* (a Lens's sort key — the canonical case is SQL's own
`ORDER BY`, which sits outside relational algebra for exactly this reason
and is confirming evidence for the grid rather than against it, since Codd's
relations are explicitly unordered sets and the tradition still put order
exactly where this law puts it). A surface that cannot say which of the four
it means has not been decomposed yet. Worked minimal pair: a table of
contents and a back-of-book index are both Lens, differing only in sort key
(Field offset vs. lexeme) and in floor (Field-spans plus a containment
Network, vs. induced Kind plus many-to-many occurrence Links).

**8.4 New corollary law — terrain is mode-blind; evaluation is not
admission.** The terrain grid is the (Domain, Grain) projection of the full
cube and therefore carries no Mode (Differentiate·Relate·Generate) — exactly
as Stance carries no Domain and the operator face carries no Grain. A
representation that generates rather than displays (a spreadsheet formula, a
parametric CAD constraint, a regex substitution, a layer blend mode) is
therefore not a tenth terrain; its generativity is an operator-face fact.
Lens already holds the canonical case — a SQL VIEW stores no rows and
returns a different answer tomorrow with no edit to the view — so a formula
cell is the same terrain in spreadsheet dress. Consequently: **a Lens's
output is an appearance, not an Entity**, until a separate commit act
(paste-values, flatten, bake, apply, materialize) admits it under §2's own
recurring-consequence law for Entity — so a write-side Lens draws no
backward Significance→Existence arrow and §3's Type B slope survives
unbroken.

**8.5 New corollary law — self-description is not self-transcendence.**
Paradigm's blindness ("what it excludes") means blind to what it has *no
term for*, not blind to what it *declares* excluded. A Limitations section,
a spec's Non-goals list, a court's "we do not decide," and this document's
own §6 all render their exclusions in their own governing vocabulary — every
item in §6 is stated in this document's own terms (terrains, composites,
closure) and not one names something the frame lacks words for. Each is
therefore a Lens with a negative selection predicate over the frame's own
body, hosted by a Paradigm and distinct from it, never a Paradigm itself:
polarity of the selection (for/against) is dress, orthogonal to grain and
domain, the same way channel and medium are elsewhere in this grid.

**8.6 New corollary law — negation is a value, not a terrain.** A surface
whose content is "this relation does not hold" acquires no cell of its own.
A determinate negative fact decomposes as a Figure-grain address applied to
Void — the shared null every terrain calls fresh (§2's own Void law): the
Figure carries the address, Void carries the emptiness, and no terrain has
a negative twin. Placement test, because the natural error is to place
every negative at Link: if the absence is a property of the *slot* (an
unfilled foreign key, a hyperlink that 404s), the native terrain is Link —
Link's own canonical-surface list is amended to say so: "the edge, resolved:
one citation, hyperlink, foreign key **with its referent admitted**, ER
arrow, join row" (the unresolved "foreign key" name alone belongs to §8.7's
law instead). If the absence is the *return of a query* evaluated over a
corpus, the native terrain is Lens, and the surface inherits Lens's own
stated blindness: a negative Lens must render its own scope — which
records, which vocabulary, which moment — where the verdict renders, or it
reads as "false in the world" when it means "empty in this index, right
now."

**8.7 New corollary law — blindness is unresolvability, not silence.** The
"blind to" column names what an atom cannot *resolve at its own grain in
isolation*, never what tokens it may carry. A slot bearing another terrain's
name — a foreign key, a Message-ID, a media type, a type URL — is a
reference to that terrain, not an instance of it, and does not by itself
make the atom a composite; this is required, not optional, since §3's own
Type B edges (Link ← Entity, Kind ← Link) consume exactly those tokens, so
an Entity blind to relation *tokens* would make its own cross-Domain slope
unbuildable. Operational test: excise the artifact from every other
artifact and ask what it can still resolve — an unresolved In-Reply-To
header alone cannot tell you whether its parent exists, which is why mail
clients still run a separate threading pass over the whole mailbox.

**8.8 Link's build law is incomplete — anonymous-endpoint Links need no
Entity floor.** "Link needs its endpoint Entities first" holds for *named*
Links (a foreign key, a citation) and fails for a second species this census
found no home for otherwise: a *measured* Link, admitted directly from a
Field by contiguity statistics over displacement, with no Entity floor at
all — one Bragg reflection, one Fourier component, one autocorrelation lag,
one variogram bin. Each is individuated in practice (indexed, integrated,
scaled, flagged, rejectable one at a time) with anonymous endpoints — a
class of position-pairs, never two admitted records. This is what makes a
reciprocal-space display (a diffraction pattern, a power spectrum) place at
Structure·Pattern rather than Existence·Pattern: Field → measured-Link →
Network is a legal Type A ascent with no Entity anywhere underneath, and a
Pattern built only from anonymous Links may not be re-read as an Existence
claim without importing Entities from outside the measurement — which is
the phase problem, restated as a corollary law. Cite alongside §5: a
representation-side theorem (Patterson 1934, via Wiener–Khinchin) proving
the backward arrow does not exist, stronger evidence than either subsumption
already filed there.

**8.9 New corollary law — terrain is addressability, never legibility.** A
parameter that changes what a surface makes *perceptible* without changing
what it makes *addressable* is a Lens or Stance-face resolution setting, not
a terrain change — legibility is not terrain. Discriminator, because §2's
own table invites the confusion by listing "histogram bins" one line above
Field's "raster": a histogram bin answers a *membership* query (the bin IS
the category, addressable by name — a Kind parameter, re-cutting bin width
genuinely changes what's addressable); a spectrogram frequency bin answers a
*location* query (a coordinate; no membership fact is stored in the array —
a Lens parameter, changing STFT window length re-samples the lattice and
changes only what's legible, bounded by one physical law, Δt·Δf, holding
the same cell budget reshaped anisotropically either way).
