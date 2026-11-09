# Phrase editorial standards

Use this when drafting or reviewing new Verble phrases. The user-approved examples
are in [the production phrase reference](production-phrase-meanings-review.md).
The matching JSON preserves production IDs, original values, approved copy, and
references; it is a historical snapshot, not an automatic import source.

## Meaning style

- Write an original, brief, plain-language explanation, usually one sentence.
  Aim for roughly 10–25 words, allowing more when nuance requires it.
- Explain the figurative meaning rather than repeating the phrase literally.
- Use accessible language and preserve important context for literary quotations.
- Describe what a saying expresses rather than treating it as a universal fact.
  Do not promise medical benefits, guaranteed success, or resilience after trauma.
- For sayings with multiple established readings, capture the distinction briefly
  or flag the entry for review. Avoid inventing a single definitive interpretation.
- No live AI generation during gameplay: store reviewed copy in `meaning`.
- Display meanings only in the result dialog, separately from attribution.

Example: **Birds of a feather flock together** — People with similar interests,
qualities, or habits tend to spend time together.

## Attribution standards

- `source_note` holds the displayed attribution. A meaning reference is not
  necessarily the source or origin of the phrase.
- Use `Proverb`, `Idiom`, `Common saying`, or `Traditional saying` when a generic
  classification is appropriate. These labels do not claim a proven origin.
- Credit a person or work only with supporting evidence. Prefer the original text,
  an authoritative edition, an official creator source, or careful quotation research.
- Add the work (and scene/date where useful) to disambiguate literary and cultural
  quotations. Distinguish songwriters from performers when relevant.
- Mark adaptations, excerpts, and translated variants. Do not present modernized
  wording as an exact quotation or assume popularization proves authorship.
- Use qualified wording or an unknown-author label when evidence is uncertain.
  Do not fill attribution gaps by guessing a famous person.
- Keep reference URLs and research caveats in the review artifact; they need not
  all appear in the player-facing attribution.

Examples: **No man is an island** — John Donne, Meditation XVII.
**The secret of getting ahead is getting started** — Common saying; author uncertain.
The previously stored Mark Twain attribution was not supported by the research.

## Review and production updates

1. Read the actual target phrases and existing meanings/attributions.
2. Prepare numbered drafts with original values, proposed values, references, and
   uncertainty notes. New entries start pending; prior approvals do not approve them.
3. Let the user review and explicitly approve changes before production writes.
4. Match by stable production ID and verify text and original values still match.
   Never substitute local database IDs or silently overwrite concurrent edits.
5. Apply the approved batch transactionally and verify each stored value afterward.
6. Preserve the approved review and before/after snapshot in Git. Do not automatically
   load editorial fixtures on deployment or change phrase text, scheduling, or results
   as part of a meaning/attribution import.
