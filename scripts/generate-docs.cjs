const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '../apps/help-center/src/content');
const DIRS_TO_SCAN = [
    path.join(__dirname, '../src'),
    path.join(__dirname, '../apps/admin-portal/src')
];

const TEMPLATE = (title) => `---
title: ${title}
category: Generated
---

# ${title}

## Feature Overview

* What is this feature?
* Why does it exist?
* Who should use it?
* What problem does it solve?

## Required Permissions

* Owner
* Admin
* Manager
* Viewer

Explain exactly which roles can: View, Create, Edit, Delete, Approve, Export.

## Location

Explain where the feature can be found. Example: Settings → Projects

## Step-by-Step Guide

Step 1...

## Use Cases

Provide real-world examples.

## Best Practices

Explain recommended workflows.

## Limitations

Explain restrictions and edge cases.

## FAQs

Include common user questions.

## Troubleshooting

Explain common mistakes and solutions.

## Related Articles
`;

if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
}

function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            // Very simple heuristic: just use the filename if it's a prominent component
            // Alternatively, regex for exported components.
            const content = fs.readFileSync(fullPath, 'utf8');
            const exportedComponents = [...content.matchAll(/export\s+(default\s+)?(?:function|const|class)\s+([A-Z][a-zA-Z0-9]+)/g)];
            
            for (const match of exportedComponents) {
                const compName = match[2];
                // Ignore small or generic components if possible
                if (compName.length < 4 || compName.includes('Icon') || compName.includes('Button')) continue;

                const docPath = path.join(DOCS_DIR, `${compName}.md`);
                if (!fs.existsSync(docPath)) {
                    console.log(`Generating doc for ${compName}...`);
                    fs.writeFileSync(docPath, TEMPLATE(compName));
                }
            }
        }
    }
}

for (const d of DIRS_TO_SCAN) {
    scanDir(d);
}

console.log('Documentation generation scan complete.');
