/**
 * Large-display scaling helpers.
 *
 * The site was designed on a 1440px canvas. On wider displays the page
 * container grows (see --page-max in tokens.css) and a type/measure scale
 * factor (--ts) enlarges text and reading measures proportionally so the
 * layout fills the screen instead of sitting as a 1440px strip in the middle.
 *
 * Use `px(n)` wherever an inline style used to hard-code `n` pixels for a
 * font size, reading measure, or column width that should grow with --ts.
 */
export const px = (n: number): string => `calc(${n}px * var(--ts))`;

/** Grid template for the "label rail + content" pattern used across sections. */
export const railGrid = 'var(--rail) minmax(0, 1fr)';

/** Left offset that lines content up with the rail grid's second column. */
export const railOffset = 'calc(var(--rail) + var(--rail-gap))';
