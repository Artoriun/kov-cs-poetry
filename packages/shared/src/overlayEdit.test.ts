import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { overlayEdit } from './overlayEdit';
import { PAGE_BREAK } from './pageBreaks';

/** The admin's edit state, as far as this decision is concerned. */
const state = (overlay: string, customSlidesOpen = false) => ({ overlay, customSlidesOpen });

describe('overlayEdit', () => {
  test('an ordinary edit changes nothing but the text', () => {
    assert.deepEqual(overlayEdit(state('one'), 'one two'), { overlay: 'one two' });
  });

  test('typing the first mark opens Custom Slides on the split', () => {
    const patch = overlayEdit(state('one\ntwo'), `one${PAGE_BREAK}two`);
    assert.equal(patch.customSlidesOpen, true);
    assert.equal(patch.customSlidesEnabled, true);
    assert.deepEqual(patch.customSlides, ['one', 'two']);
  });

  test('with the slides open, a later edit re-splits them', () => {
    const patch = overlayEdit(
      state(`one${PAGE_BREAK}two`, true),
      `one${PAGE_BREAK}two${PAGE_BREAK}three`,
    );
    assert.deepEqual(patch.customSlides, ['one', 'two', 'three']);
  });

  test('closing the slides while marks remain keeps them closed', () => {
    // The trap this rule exists for. Opening whenever a mark is merely present would mean
    // the next keystroke reopened Custom Slides forever, since the marks are still in the
    // text — there would be no way to turn the feature off without deleting them.
    const patch = overlayEdit(state(`one${PAGE_BREAK}two`, false), `one${PAGE_BREAK}two three`);
    assert.deepEqual(patch, { overlay: `one${PAGE_BREAK}two three` });
  });

  test('deleting every mark and typing a new one opens the slides again', () => {
    assert.equal(
      overlayEdit(state('one two', false), `one${PAGE_BREAK}two`).customSlidesOpen,
      true,
    );
  });

  test('an unmarked edit never touches hand-authored slides', () => {
    // Two poems ship with Custom Slides on and no marks. Mirroring unconditionally would
    // collapse them to a single page the moment anyone fixed a typo.
    assert.deepEqual(overlayEdit(state('one\ntwo', true), 'one\ntwo\nthree'), {
      overlay: 'one\ntwo\nthree',
    });
  });

  test('no mark survives into the slides it produces', () => {
    const patch = overlayEdit(state('', false), `a${PAGE_BREAK}b${PAGE_BREAK}c`);
    for (const slide of patch.customSlides ?? []) {
      assert.ok(!slide.includes(PAGE_BREAK), `marker leaked into ${JSON.stringify(slide)}`);
    }
  });
});
