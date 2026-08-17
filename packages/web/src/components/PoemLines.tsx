/**
 * A poem's text, line by line, wherever it is shown whole rather than paged.
 *
 * The grid cards and the admin previews used to hand the whole string to a `white-space:
 * pre-wrap` box and let the browser break it. That renders a blank line between two stanzas at
 * the full line-height of the text, which is what the reader itself used to do — until the
 * pagination fix gave that separator its own smaller height. The previews were left behind, so
 * the same poem sat one way on the card and another way on the page.
 *
 * Per-line spans are what make the difference expressible at all: a text node offers nothing to
 * hang a rule on. `.is-stanza-gap` is the same class the reader marks its blank lines with, and
 * the same rule sizes both.
 *
 * The lines are wrapped in one element on purpose. Every one of these overlays is a flex
 * column, so a bare list of spans would turn each line into its own flex item and centre them
 * individually — a ragged edge instead of a left-aligned block. One wrapper keeps the whole
 * poem as a single item, aligned as before, with the lines as ordinary blocks inside it.
 */

import { stripPageBreaks } from '@gedichtenv2/shared';

export default function PoemLines({ text }: { text: string }) {
  return (
    <span className="poem-lines">
      {stripPageBreaks(text)
        .split('\n')
        .map((line, i) => (
          <span
            // Poem lines are positional and never reorder, and two of the poems repeat a line,
            // so keying by text would collide.
            // biome-ignore lint/suspicious/noArrayIndexKey: positional list, duplicate lines exist
            key={i}
            className={`poem-line${line.trim() === '' ? ' is-stanza-gap' : ''}`}
          >
            {line || ' '}
          </span>
        ))}
    </span>
  );
}
