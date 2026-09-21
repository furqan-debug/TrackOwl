/**
 * The colours a project can be, and the ones charts fall back to.
 *
 * Generated in OKLCH at a fixed lightness (0.62) and chroma (0.16) with the
 * hues spaced around the wheel. Holding L and C constant is what makes them
 * read as one set: none shouts louder than the others, none fades beside them.
 *
 * Mid lightness because a project's colour is not only a swatch — the projects
 * list prints the project name IN it, on a 10% tint of itself. Every colour
 * here clears 3:1 against both #FFFFFF and #0F172A, so it holds up in either
 * theme.
 *
 * Plain hex, deliberately: several places build a tint by appending alpha to
 * the value, as `${project.color}10`. A CSS variable would produce
 * "var(--whatever)10", which is not a colour.
 */
export const PROJECT_COLORS = [
    '#B27B00', // gold — the brand hue
    '#D06217', // orange
    '#D5565D', // rose
    '#C35AA4', // magenta
    '#966CD7', // purple
    '#617DE6', // indigo
    '#00A2A4', // teal
    '#2B9F4A', // green
] as const;

/** What a project is given when nothing has been chosen. */
export const DEFAULT_PROJECT_COLOR = '#617DE6';

/**
 * A stable colour for the nth item in a chart.
 *
 * Used where the data has no colour of its own to offer. Once projects carry
 * distinct colours of their own, prefer those and keep this as the fallback.
 */
export function chartColorAt(index: number): string {
    return PROJECT_COLORS[index % PROJECT_COLORS.length];
}
