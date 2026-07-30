# Slot deltas and embeddings — what they can and cannot do

Measured against `Xenova/all-MiniLM-L6-v2` and
`Xenova/paraphrase-multilingual-MiniLM-L12-v2`, on Frankenstein, War and
Peace, and Garoa. Recorded so none of it is retried blind.

The technique throughout is eoreader5's `packages/def/svo.js` differential:

    delta(w) = embed(clause) - embed(clause with w masked)

with a **Born gate**: a delta counts only if it beats masking some OTHER real
word in the same sentence. That null preserves the sentence, the encoder and
the masking operation, and breaks only WHICH position was masked.

---

## WORKS — the referent-capable class, discovered without labels

Profiling each word by what it does to a slot:

  * `magnitude`   how much of the clause rides on this slot
  * `consistency` how alike a word's own deltas are across contexts
  * `salience`    how often it beats the Born null

Clustering on that (no labels used to compute anything) yields **one
coherent class** on lowercased War and Peace:

    CLASS 1  consistency 0.830  salience 0.65
      father, horse, kutúzov, moscow, natásha, petersburg, pierre, soldier

People, places and concrete common nouns together; no proper/common split.
The class is **things that can be a referent** — an ontological class, not a
part of speech, and exactly the one the existence tier needs.

Function words separate from it at **d = 3.80** (War and Peace) and
**d = 3.78** (Frankenstein) — two books, different centuries, authors,
translators and name morphologies, same effect size to two decimals.

Controls that held:

  * **Capitalization ruled out.** War and Peace fully lowercased; the names
    still lead. Not an orthographic artefact.
  * **Rarity is not the mechanism.** Rare common nouns (regiment, adjutant,
    sovereign) sit between proper and common at d = 1.07 from proper — a
    contribution, not the cause.
  * **Empty band when empty.** Probing Frankenstein's names against War and
    Peace leaves the top band vacant. The measure does not manufacture a class.

Corrected overclaim: an earlier run reported d = 3.78 for "names vs
everything" on Frankenstein with **zero overlap**. That was inflated by probe
selection — nothing occupied the middle. Adding place names and rare commons
turns the partition into a gradient:

    proper 0.825 > rare 0.793 > common 0.763 > function 0.690

Only the function/content end of that gradient is sharp.

## FAILS — anything about relations, and the reason is measurable

    cos("the dog bit the man", "the man bit the dog") = 0.9782

Mean-pooled sentence embeddings rate two opposite events as 97.8% identical.
**Who-did-what-to-whom is very nearly absent from the representation.**

Everything downstream of that fails for the same reason:

  * **Clause binding energy.** `I(i,j) = || d_ij - (d_i + d_j) ||` is real
    (residual ~50% of joint magnitude, so strongly non-additive) but
    **uniform**: sd 0.019–0.050 across all pairs. Real constituents
    (`french~army`, `gave~order`, `prince~andrew`) do surface at the top, but
    by 0.52 vs 0.48 — inside the noise. Non-additivity is a property of the
    masking operation, not of linguistic binding. No tuples can be built from
    it as it stands.
  * **Word order, cross-linguistically.** Prediction: English (configurational)
    perturbed more by shuffling than Basque (case-marked). Measured English
    0.126 vs Basque 0.147 — **d = -0.37, the wrong sign.** No configurationality
    detected in either direction.

## What this means for the engine

The symbolic path is not a fallback. For agent/patient — the exact failure
`packages/def/attribution.js` exists to catch, where a claim hands the
creature's act to Victor — the embedding **does not carry the information**,
so SVO extraction plus referent gating plus narrator spans is the right
instrument rather than the cheap one.

Use embeddings for **what kind of thing a word is**. Do not use them for
**what happened to whom**.
