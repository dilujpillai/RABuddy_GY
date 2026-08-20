# Plan: Multilingual follow-up chips for the help assistant

Sibling to `PLAN-task-modal-image-tray.md`. Baseline: `feature/use-of-gif` at the commit
that added follow-up chips. Untracked agent working notes.

## The problem

The assistant already answers in whatever language the user writes in — that part works,
because the model is told to mirror the user's language and it does.

The **follow-up chips do not**. Their labels are fixed English strings in
`assistant-kb.js` (`followUps[].q`). So a French user gets a French answer followed by
three English buttons. That is worse than showing no chips at all for a non-English user.

`t()`, the app's existing translation helper, is **limited and currently broken**, and the
app is expected to support many languages — so routing chips through it is not viable.

## Decision

**Translate automatically inside the call we already make, then cache in `localStorage`.**
No button, no nudge, no hand-authored translation files.

Rejected alternatives and why:

- **A "translate?" button or nudge** — costs a tap to get something the user would always
  say yes to, and advertises that the app is not in their language. You already know their
  language: they just typed in it. Nudges are for optional or expensive things; this is
  neither.
- **Pre-stored translations per language** — commits someone to hand-translating every chip
  into every supported language forever, and makes each new chip a translation ticket that
  blocks release. That is precisely the burden that made `t()` unmanageable.
- **A second LLM call just for chips** — doubles latency and cost per message for something
  that is cacheable and, after warm-up, free.
- **Letting the model CHOOSE the chips** — separately rejected when chips were built.
  Selection stays in code so a chip can never point at a feature that does not exist. This
  plan changes only how labels are *displayed*, never which chips are offered.

## Three properties to preserve

1. **No extra network call.** Piggyback on the single existing request per message.
2. **Cached in `localStorage`**, keyed by `(languageCode, englishText)`. Each chip costs a
   few tokens once per language, then is instant and free forever, across sessions. With 19
   chips and only 3 shown at a time, a user converges after a handful of messages.
3. **The click payload stays canonical English.** Only the label is translated. The string
   submitted on click, the `asked` Set, and any future analytics all keep working
   regardless of display language.

## Current state (what exists to build on)

In `assistant.js`:
- `eligibleFollowUps()` / `renderFollowUps()` — selection and rendering. Chips render from
  `f.q` via `chip.textContent`. **The single place a translated label needs to be swapped in.**
- `asked` Set — dedupe, keyed by the English `f.q`. Must stay English-keyed.
- `ask(question)` — the one request. Builds `prompt` once, POSTs `{model, prompt, messages}`
  to `window.AI_URL`, reads `data.choices[0].message.content`.
- `buildSystemPrompt()` — assembles the KB. Where the translation instruction gets appended.

In `assistant-kb.js`:
- `followUps: [{ q, when, needs }]` — 19 entries.
- `language.policy` — already says to keep on-screen button/field names in the form the user
  sees. That principle should extend to chips: do not translate product terms (GOEHS,
  workflow names, button labels quoted from the UI).

## Implementation steps

### Step 1 — Cache layer (do this first, useful even in English)
`localStorage` key e.g. `rab_chip_i18n_v1` → `{ [lang]: { [englishText]: translated } }`.
- Small wrapper: `getCachedLabel(lang, en)` / `setCachedLabel(lang, en, text)`.
- Guard every access in try/catch — `localStorage` throws in private mode / when full.
- Version the key so the shape can change later without poisoning old clients.
- Cap the size (a few hundred entries) and drop oldest on overflow.

### Step 2 — Detect the display language
In priority order:
1. The app's language selector, if one is set (the user's stated preference).
2. `navigator.language`.
3. English.
Store as a short code (`fr`, `pt`, `es`). It self-corrects once the user types, since the
model's reply language is authoritative — see Step 4.

### Step 3 — Render from cache
`renderFollowUps()` uses `getCachedLabel(lang, f.q) || f.q`. English falls through
untouched, so nothing regresses if translation never runs.

### Step 4 — Ask for translations in the existing call
In `buildSystemPrompt()` (or appended in `buildPrompt`), when the chosen chips have no
cached translation for the current language, append something like:

```
The three lines below are UI suggestion buttons for a risk assessment app.
After your answer, on a final separate line, output exactly:
CHIPS: <line1> | <line2> | <line3>
translated into the SAME language you answered in. Keep product names
(GOEHS), workflow names and any quoted on-screen button labels unchanged.
If you answered in English, repeat them unchanged.
```

Then in `submit()`:
- Parse a trailing `CHIPS:` line out of the response.
- **Strip it from the text shown to the user** before rendering the bubble.
- Split on `|`, trim, and only accept if the count matches what was sent.
- Cache each against its English original.
- Re-render chips.

Malformed, missing, or count-mismatched → ignore entirely and keep English. Never show a
partially translated set.

### Step 5 — Language correction
The model's answer language is the real signal. If it replied in French while our detected
language said English, update the current language and cache under the correct code. Ask
the model to state the language code on the same trailing line
(e.g. `CHIPS[fr]: … | … | …`) rather than guessing client-side.

## Gotchas

- **Three-word chips give a translator almost no context** — "Steps", "Ladder" and similar
  come back wrong in isolation. Send them as a batch with the one-line framing above; it
  measurably helps.
- **Never render model output as HTML.** Chips use `textContent` today; keep it that way.
- **Do not let a translation failure break the answer.** The reply must render even if the
  `CHIPS:` line is absent or garbled.
- **The `CHIPS:` line must never reach the user.** Strip before display, and confirm the
  strip works when the model omits the line entirely.
- **RTL languages** (Arabic, Hebrew) will need `dir="auto"` on the chip container and the
  message bubbles. Not handled today.
- **`localStorage` may be unavailable** — fall back to an in-memory Map for the session.
- **The KB itself stays English.** Only chip labels are translated; answers are already
  produced in the user's language by the model.

## Verification

- Ask a question in French → answer French, chips French, no `CHIPS:` line visible.
- Ask again → chips render instantly from cache, and the prompt no longer requests them.
- Reload → still translated, no model call needed for those chips.
- Ask in English → chips unchanged, nothing regresses.
- Force a malformed `CHIPS:` line → answer still renders, chips fall back to English.
- Private-browsing / `localStorage` disabled → still works, just re-translates per session.
- `node --check assistant.js assistant-kb.js` plus the usual inline-block scan on index.html.

## Out of scope

- Translating the KB body, glossary or troubleshooting content — the model already
  renders answers in the user's language from the English source.
- Fixing `t()` or the app's wider i18n. This plan deliberately routes around it.
- Translating the assistant's own chrome (header, placeholder, disclaimer). Worth doing
  later via the same cache, but it is static UI and a different problem.
