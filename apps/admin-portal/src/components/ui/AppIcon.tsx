import { useMemo } from 'react';
import clsx from 'clsx';
import {
    siGooglechrome,
    siZoom,
    siWhatsapp,
    siAnydesk,
    siFirefox,
    siNotepadplusplus,
    siSpotify,
    siDiscord,
    siTelegram,
    siGooglemeet,
    siGooglesheets,
    siGooglecalendar,
    siGmail,
    siGoogledrive,
    siGithub,
    siFigma,
    siNotion,
    siTrello,
    siJira,
    siPostman,
    siOpera,
    siBrave,
} from 'simple-icons';

type Logo = { path: string; hex: string };

/**
 * The same app arrives under several names: "Google Chrome" and "chrome",
 * "Microsoft Teams" and "ms-teams", "LockApp.exe", "WhatsApp.Root",
 * "Microsoft.Notes". Matching exactly would put a logo on 59% of Chrome rows
 * and leave the other 2% blank, so everything is normalised first.
 */
function normalise(name: string): string {
    return name
        .toLowerCase()
        .replace(/\.exe$/, '')
        .replace(/\.(root|app|desktop)$/, '')
        .replace(/[._-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Real logos, for the apps a licensed icon set actually carries. */
const LOGOS: Record<string, Logo> = {
    'google chrome': siGooglechrome,
    'chrome': siGooglechrome,
    'zoom meetings': siZoom,
    'zoom': siZoom,
    'zoom workplace': siZoom,
    'whatsapp': siWhatsapp,
    'anydesk': siAnydesk,
    'firefox': siFirefox,
    'mozilla firefox': siFirefox,
    'notepad++': siNotepadplusplus,
    'spotify': siSpotify,
    'discord': siDiscord,
    'telegram': siTelegram,
    'google meet': siGooglemeet,
    'meet': siGooglemeet,
    'google sheets': siGooglesheets,
    'google calendar': siGooglecalendar,
    'gmail': siGmail,
    'google drive': siGoogledrive,
    'github': siGithub,
    'figma': siFigma,
    'notion': siNotion,
    'trello': siTrello,
    'jira': siJira,
    'postman': siPostman,
    'opera': siOpera,
    'brave': siBrave,
};

/**
 * Brand colours for apps with no logo available. Microsoft's marks and Slack's
 * were withdrawn from the icon set over trademark, and drawing them by hand
 * would mean shipping a bad imitation of someone's logo — so these get their
 * initial on a tile in the right colour instead, which is recognisable without
 * pretending to be the real mark.
 */
const BRAND_COLORS: Record<string, string> = {
    'microsoft teams': '#6264A7',
    'ms teams': '#6264A7',
    'teams': '#6264A7',
    'microsoft edge': '#0078D7',
    'msedge': '#0078D7',
    'edge': '#0078D7',
    'slack': '#4A154B',
    'microsoft word': '#2B579A',
    'winword': '#2B579A',
    'microsoft excel': '#217346',
    'excel': '#217346',
    'microsoft powerpoint': '#D24726',
    'outlook': '#0072C6',
    'microsoft outlook': '#0072C6',
    'microsoft notes': '#7719AA',
    'onenote': '#7719AA',
    'notepad': '#5A5A5A',
    'windows explorer': '#FFB900',
    'explorer': '#FFB900',
    'dialpad for desktops': '#7C52FF',
    'dialpad': '#7C52FF',
    'wps office': '#D0433B',
    'visual studio code': '#007ACC',
    'code': '#007ACC',
    'trackowl': '#F2CB00',
};

interface AppIconProps {
    name: string;
    /** Tailwind size classes for the tile, e.g. "w-10 h-10". */
    className?: string;
}

/**
 * A logo for an app, or failing that its initial in the app's brand colour.
 *
 * Nothing is fetched: no favicon service, no network call per row. A monitoring
 * product should not be sending the list of sites its users visit to a third
 * party just to decorate a table.
 */
export function AppIcon({ name, className }: AppIconProps) {
    const { logo, color, initial } = useMemo(() => {
        const key = normalise(name || '');
        const found = LOGOS[key];
        return {
            logo: found ?? null,
            color: found?.hex ? `#${found.hex}` : BRAND_COLORS[key] ?? null,
            initial: (name || '?').replace(/[^\p{L}\p{N}]/u, '').charAt(0).toUpperCase() || '?',
        };
    }, [name]);

    // Unknown app: a neutral tile, the same as before this existed.
    if (!logo && !color) {
        return (
            <div
                className={clsx(
                    'rounded-xl bg-surface-hover border border-border flex items-center justify-center',
                    'text-text-muted text-[12px] font-bold shrink-0',
                    className
                )}
            >
                {initial}
            </div>
        );
    }

    return (
        <div
            className={clsx(
                'rounded-xl border flex items-center justify-center shrink-0',
                className
            )}
            style={{
                // A tint of the brand colour, so a wall of logos does not turn
                // into a wall of saturated squares.
                backgroundColor: `${color}1A`,
                borderColor: `${color}33`,
                color: color ?? undefined,
            }}
            title={name}
        >
            {logo ? (
                <svg viewBox="0 0 24 24" className="w-1/2 h-1/2" fill="currentColor" aria-hidden>
                    <path d={logo.path} />
                </svg>
            ) : (
                <span className="text-[12px] font-bold">{initial}</span>
            )}
        </div>
    );
}
