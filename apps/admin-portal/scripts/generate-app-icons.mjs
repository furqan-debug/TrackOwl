/**
 * Pulls the full-colour artwork AppIcon needs out of the Iconify collections
 * and writes it into src/components/ui/appIconArt.ts.
 *
 * The collections hold about 3,700 icons between them. Importing either one
 * directly would put all of that in the bundle, so they stay devDependencies
 * and only the icons listed below are copied out.
 *
 * Run: npm run gen:app-icons
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SETS = {
    logos: require('@iconify-json/logos/icons.json'),
    'vscode-icons': require('@iconify-json/vscode-icons/icons.json'),
};

/** App name (already normalised by AppIcon) -> icon in "<set>:<name>" form. */
const MAP = {
    // Browsers
    'google chrome': 'logos:chrome', 'chrome': 'logos:chrome',
    'microsoft edge': 'logos:microsoft-edge', 'msedge': 'logos:microsoft-edge',
    'edge': 'logos:microsoft-edge',
    'firefox': 'logos:firefox', 'mozilla firefox': 'logos:firefox',
    'opera': 'logos:opera', 'brave': 'logos:brave',
    // Microsoft 365
    'microsoft teams': 'logos:microsoft-teams', 'ms teams': 'logos:microsoft-teams',
    'teams': 'logos:microsoft-teams',
    'microsoft word': 'vscode-icons:file-type-word', 'winword': 'vscode-icons:file-type-word',
    'microsoft excel': 'vscode-icons:file-type-excel', 'excel': 'vscode-icons:file-type-excel',
    'microsoft powerpoint': 'vscode-icons:file-type-powerpoint',
    'powerpnt': 'vscode-icons:file-type-powerpoint',
    'microsoft outlook': 'vscode-icons:file-type-outlook',
    'outlook': 'vscode-icons:file-type-outlook',
    'microsoft notes': 'vscode-icons:file-type-onenote',
    'onenote': 'vscode-icons:file-type-onenote',
    'access': 'vscode-icons:file-type-access',
    'acrobat': 'vscode-icons:file-type-pdf2', 'adobe acrobat': 'vscode-icons:file-type-pdf2',
    'adobe acrobat reader': 'vscode-icons:file-type-pdf2',
    'onedrive': 'logos:microsoft-onedrive', 'skype': 'logos:skype',
    'microsoft': 'logos:microsoft',
    // Windows shell
    'windows explorer': 'logos:microsoft-windows', 'explorer': 'logos:microsoft-windows',
    'settings': 'logos:microsoft-windows', 'lockapp': 'logos:microsoft-windows',
    'loginwindow': 'logos:microsoft-windows', 'searchhost': 'logos:microsoft-windows',
    'shellhost': 'logos:microsoft-windows', 'shellexperiencehost': 'logos:microsoft-windows',
    'windows shell experience host': 'logos:microsoft-windows',
    'applicationframehost': 'logos:microsoft-windows',
    'application frame host': 'logos:microsoft-windows',
    'file picker ui host': 'logos:microsoft-windows', 'widgetboard': 'logos:microsoft-windows',
    'monotificationux': 'logos:microsoft-windows', 'textinputhost': 'logos:microsoft-windows',
    'systemsettings': 'logos:microsoft-windows', 'taskmgr': 'logos:microsoft-windows',
    'task manager': 'logos:microsoft-windows',
    // Meetings and messaging
    'zoom meetings': 'logos:zoom', 'zoom': 'logos:zoom', 'zoom workplace': 'logos:zoom',
    'slack': 'logos:slack', 'whatsapp': 'logos:whatsapp',
    'discord': 'logos:discord', 'telegram': 'logos:telegram',
    'google meet': 'logos:google-meet', 'meet': 'logos:google-meet',
    // Google
    'gmail': 'logos:google-gmail', 'google drive': 'logos:google-drive',
    'google calendar': 'logos:google-calendar',
    // Work
    'linkedin': 'logos:linkedin', 'salesforce': 'logos:salesforce',
    'notion': 'logos:notion', 'trello': 'logos:trello', 'jira': 'logos:jira',
    'asana': 'logos:asana', 'clickup': 'logos:clickup', 'miro': 'logos:miro',
    'loom': 'logos:loom', 'dropbox': 'logos:dropbox', 'figma': 'logos:figma',
    'zendesk': 'logos:zendesk', 'hubspot': 'logos:hubspot',
    // Developer
    'visual studio code': 'logos:visual-studio-code', 'code': 'logos:visual-studio-code',
    'vscode': 'logos:visual-studio-code',
    'github': 'logos:github', 'postman': 'logos:postman', 'npm': 'logos:npm',
    'docker': 'logos:docker', 'vercel': 'logos:vercel', 'supabase': 'logos:supabase',
    'stack overflow': 'logos:stackoverflow',
    // AI
    'claude': 'logos:claude', 'anthropic': 'logos:claude',
    'chatgpt': 'logos:openai', 'openai': 'logos:openai',
    // Media and social
    'spotify': 'logos:spotify', 'steam': 'logos:steam',
    'steam client webhelper': 'logos:steam',
    'facebook': 'logos:facebook', 'instagram': 'logos:instagram',
    'youtube': 'logos:youtube', 'tiktok': 'logos:tiktok', 'reddit': 'logos:reddit',
};

function resolve(ref) {
    const [setName, baseName] = ref.split(':');
    const set = SETS[setName];
    if (!set) throw new Error(`unknown set in ${ref}`);
    // Many entries in the logos set are the full horizontal wordmark, which is
    // unreadable in a 40px tile. Where the collection also ships a square
    // "-icon" variant, that is the one we want.
    const iconName = set.icons[`${baseName}-icon`] ? `${baseName}-icon` : baseName;
    let icon = set.icons[iconName];
    let name = iconName;
    // Follow an alias to its parent, which is where the body lives.
    for (let i = 0; !icon && i < 5; i++) {
        const alias = set.aliases?.[name];
        if (!alias) break;
        name = alias.parent;
        icon = set.icons[name];
    }
    if (!icon) return null;
    return {
        body: icon.body,
        w: icon.width ?? set.width ?? 24,
        h: icon.height ?? set.height ?? 24,
    };
}

const out = {};
const missing = [];
for (const [app, ref] of Object.entries(MAP)) {
    const icon = resolve(ref);
    if (!icon) { missing.push(`${app} -> ${ref}`); continue; }
    out[app] = icon;
}
if (missing.length) {
    console.error('Could not resolve:\n  ' + missing.join('\n  '));
    process.exit(1);
}

// Many app names share one icon — every Windows shell process points at the
// same artwork. Emit each icon once and have the names reference it, or the
// Windows body alone would be repeated twenty times.
const byRef = new Map();
for (const [app, ref] of Object.entries(MAP)) {
    if (!out[app]) continue;
    if (!byRef.has(ref)) byRef.set(ref, { icon: out[app], apps: [] });
    byRef.get(ref).apps.push(app);
}
const constName = (ref) => ref.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');

const consts = [...byRef].map(([ref, { icon }]) =>
    `const ${constName(ref)}: IconArt = { w: ${icon.w}, h: ${icon.h}, body: ${JSON.stringify(icon.body)} };`
).join('\n');

const entries = [...byRef].map(([ref, { apps }]) =>
    apps.map((a) => `    ${JSON.stringify(a)}: ${constName(ref)},`).join('\n')
).join('\n');

writeFileSync(
    new URL('../src/components/ui/appIconArt.ts', import.meta.url),
    `// GENERATED FILE — do not edit by hand.
// Run \`npm run gen:app-icons\` after changing scripts/generate-app-icons.mjs.
//
// Full-colour brand artwork, copied out of @iconify-json/logos and
// @iconify-json/vscode-icons so the bundle carries only what AppIcon uses.

export type IconArt = { w: number; h: number; body: string };

${consts}

export const COLOR_ART: Record<string, IconArt> = {
${entries}
};
`,
    'utf8'
);

const bytes = readFileSync(new URL('../src/components/ui/appIconArt.ts', import.meta.url)).length;
console.log(`wrote appIconArt.ts — ${Object.keys(out).length} icons, ${(bytes / 1024).toFixed(1)} kB`);
