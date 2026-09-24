/**
 * The colours a project can be, and the ones charts fall back to.
 *
 * Eight hues spread around the wheel so that no two projects sitting next to
 * each other in a legend or a donut read as the same colour.
 *
 * Plain hex, deliberately: several places build a tint by appending alpha to
 * the value, as `${project.color}10`. A CSS variable would produce
 * "var(--whatever)10", which is not a colour.
 *
 * One caveat worth knowing before adding more. The projects list prints a
 * project's initial IN its colour, on a 10% tint of itself, so the colour has
 * to carry text as well as fill a swatch. Measured against white, four of
 * these fall under the 3:1 that needs:
 *
 *     indigo 4.47   pink 3.53   purple 3.96   rose 3.67    — fine
 *     cyan   2.43   green 2.54  amber 2.15   sky 2.14      — thin in light mode
 *
 * Against the dark surface (#0F172A) all eight clear 4:1 comfortably, so this
 * only shows up in light mode, and only on that one initial — swatches, donut
 * segments and legend dots are unaffected.
 */
export const PROJECT_COLORS = [
    '#6366F1', // electric indigo
    '#06B6D4', // bright cyan
    '#10B981', // emerald green
    '#F59E0B', // amber orange
    '#EC4899', // coral pink
    '#A855F7', // neon purple
    '#38BDF8', // sky blue
    '#F43F5E', // rose red
] as const;

/** What a project is given when nothing has been chosen. */
export const DEFAULT_PROJECT_COLOR = '#6366F1';

/**
 * A stable colour for the nth item in a chart.
 *
 * Used where the data has no colour of its own to offer. Once projects carry
 * distinct colours of their own, prefer those and keep this as the fallback.
 */
export function chartColorAt(index: number): string {
    return PROJECT_COLORS[index % PROJECT_COLORS.length];
}
