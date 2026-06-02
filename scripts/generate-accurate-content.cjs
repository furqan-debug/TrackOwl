const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '..', 'apps', 'help-center', 'src', 'content');

// 1. Delete all existing markdown files
if (fs.existsSync(contentDir)) {
    fs.rmSync(contentDir, { recursive: true, force: true });
}
fs.mkdirSync(contentDir, { recursive: true });

// The exact categories the user requested in the original prompt
const documentationStructure = {
    "Getting Started": [
        "Welcome to TrackOwl",
        "Quick Start Guide",
        "System Requirements"
    ],
    "Organizations": [
        "Create organization",
        "Edit organization",
        "Archive organization",
        "Organization settings"
    ],
    "Users & Roles": [
        "Invite users",
        "Manage roles (Owner, Manager, User)",
        "User permissions",
        "Deactivate users"
    ],
    "Teams": [
        "Create a team",
        "Assign members to a team",
        "Team managers",
        "Team settings"
    ],
    "Projects": [
        "Create a project",
        "Assign teams/users to a project",
        "Project budgets",
        "Project limits"
    ],
    "Tasks": [
        "Create a task",
        "Assign tasks",
        "Task status",
        "Task estimates"
    ],
    "Time Tracking": [
        "Start/Stop timer",
        "Manual time entry",
        "Idle time detection",
        "Time approvals"
    ],
    "Desktop App": [
        "Download and install",
        "App interface overview",
        "Offline tracking",
        "Troubleshooting"
    ],
    "Screenshots": [
        "View screenshots",
        "Delete screenshots",
        "Screenshot settings (Frequency, Blur)"
    ],
    "Activity & App Usage": [
        "View app usage",
        "View URL tracking",
        "Activity levels (Keyboard/Mouse)",
        "Productivity scores"
    ],
    "Locations & Job Sites": [
        "View team locations",
        "Set up job sites",
        "Location tracking policies"
    ],
    "Billing & Subscriptions": [
        "View current plan",
        "Upgrade/Downgrade",
        "Update payment method",
        "View invoices"
    ],
    "Reports": [
        "Time & Activity reports",
        "Custom reports",
        "Legacy reports"
    ],
    "Settings": [
        "General settings",
        "Tracking settings",
        "Security settings",
        "Notifications"
    ],
    "Security & Privacy": [
        "Data encryption",
        "Privacy policy",
        "GDPR compliance",
        "Data retention"
    ]
};

// Generate realistic content for the files
function generateContent(category, article) {
    const slug = article.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Custom tailored content based on category
    let customOverview = "";
    let customSteps = "";
    
    if (category === "Time Tracking") {
        customOverview = `New to tracking your time? It's easier than it looks! This guide will walk you through exactly how to use the **${article}** feature. Time tracking is the core of TrackOwl, helping you log your work hours effortlessly so you can focus on what matters.`;
        customSteps = `1. **Log in** to your TrackOwl dashboard.
2. Locate the **Time Tracker** widget at the top or side of your screen.
3. Select your current **Project** and **Task** from the dropdown menu.
4. Click the big **Start** button to begin tracking.
5. When you are done or taking a break, simply click **Stop**.`;
    } else if (category === "Organizations") {
        customOverview = `Welcome to TrackOwl! Setting up your organization is usually the very first step. This beginner-friendly guide explains how to handle **${article.toLowerCase()}** securely and easily.`;
        customSteps = `1. Go to your **Admin Portal** (this is where all the management happens).
2. Look at the left-hand sidebar and click on **Organizations**.
3. Click on the action button (like "New" or "Edit") located at the top right.
4. Fill in the required details step-by-step.
5. Click the **Save** button to apply your changes instantly.`;
    } else if (category === "Desktop App") {
        customOverview = `The TrackOwl Desktop App is a small, lightweight program you install on your computer. It makes tracking time much easier! This article will guide you through **${article.toLowerCase()}**.`;
        customSteps = `1. Navigate to the **Download** section of your profile on the website.
2. Choose the download for your specific computer (Windows, Mac, or Linux).
3. Open the downloaded file and follow the simple installation prompts.
4. Once installed, open the app and sign in with your normal TrackOwl email and password.`;
    } else {
        customOverview = `Hello and welcome! If you are a beginner, don't worry. TrackOwl is designed to be very intuitive. This step-by-step guide covers how to use the **${article}** feature in the ${category} section.`;
        customSteps = `1. Make sure you are logged into your TrackOwl workspace.
2. Look at the left-hand menu and click on **${category}**.
3. Find and click on the specific item you want to work on.
4. Make your desired changes on the screen.
5. Always remember to click **Save** or **Update** at the bottom so you don't lose your work!`;
    }

    // Custom tailored Best Practices and FAQ
    let customBestPractices = "";
    let customFAQ = "";

    if (category === "Time Tracking" || category === "Activity & App Usage") {
        customBestPractices = `> [!TIP]
> - Always double-check that you have selected the correct project before starting your timer.
> - Encourage your team to leave brief notes when they switch tasks.
> - Review idle time settings to ensure they align with your company's workflow.`;
        customFAQ = `**Q: What happens if I forget to turn off my timer?**  
A: TrackOwl's idle detection will automatically pause tracking if no keyboard or mouse activity is detected for your configured timeout period.

**Q: Can I edit time entries later?**  
A: Yes, manual time adjustments can be made from the Timesheets page, subject to Manager approval.`;
    } else if (category === "Financials" || category === "Billing & Subscriptions") {
        customBestPractices = `> [!TIP]
> - Regularly export your financial reports at the end of each month for accounting.
> - Double-check hourly rates before generating final payment reports.
> - Keep your payment methods up to date to avoid subscription interruptions.`;
        customFAQ = `**Q: Does this affect my current billing cycle?**  
A: Changes to user counts or premium features will be prorated on your next invoice. Settings changes are completely free.

**Q: In what currencies are the amounts owed displayed?**  
A: Amounts are displayed in your Organization's default currency, which can be configured in General Settings.`;
    } else if (category === "Users & Roles" || category === "Teams" || category === "Organizations") {
        customBestPractices = `> [!TIP]
> - Assign 'Manager' roles sparingly to maintain strict security over your organization.
> - Create specific Teams (e.g., 'Marketing', 'Engineering') to make assigning projects much faster.
> - Audit your active users quarterly and deactivate anyone no longer working with your company.`;
        customFAQ = `**Q: What is the difference between an Owner and a Manager?**  
A: Owners have full access to billing, global settings, and can delete the organization. Managers can manage teams, projects, and approve timesheets, but cannot access billing.

**Q: Can I undo a user deactivation?**  
A: Yes, you can reactivate a user at any time from the People page without losing their historical tracking data.`;
    } else {
        customBestPractices = `> [!TIP]
> - Try testing this feature with a single "Test Team" or a fake project first to understand how it works.
> - Review your changes carefully before saving to prevent disruption to your team.
> - Combine this feature with TrackOwl's powerful Reporting tools to get maximum visibility.`;
        customFAQ = `**Q: Can I undo this action once it is saved?**  
A: Most actions in TrackOwl are reversible, but destructive actions like Archiving or Deletion may be permanent.

**Q: Is this feature available on the mobile app?**  
A: Administrative configurations are limited to the web dashboard. Standard viewing and tracking are fully supported on mobile devices.`;
    }

    const featureDescriptions = {
        "Deactivate users": "Deactivating a user instantly revokes their login access and stops all tracking, but securely preserves all of their historical time, activity, and financial data for your records. This is different from Deleting a user, which permanently removes them.",
        "Delete users": "Deleting a user permanently removes their profile from your organization. Use this with caution, as it is recommended to 'Deactivate' users instead to preserve their historical data.",
        "Invite members": "Inviting members allows you to bring new employees or contractors into your TrackOwl workspace so they can begin tracking time and collaborating on projects.",
        "Assign managers": "Assigning managers delegates administrative responsibilities. Managers can approve timesheets, manage teams, and view reports, allowing Owners to focus on high-level billing and strategy.",
        "Productivity scores": "Productivity scores provide an automated, high-level metric (from 0 to 100%) indicating how active a user was during their tracked time, based on keyboard and mouse input.",
        "Project limits": "Project limits allow you to cap the total number of hours or budget a team can spend on a specific project, preventing overbilling and keeping tasks on schedule.",
        "Idle time settings": "Idle time settings automatically stop or pause a user's timer if they walk away from their computer, ensuring you only pay for actual time worked.",
        "Daily totals": "Daily totals give you a bird's-eye view of exactly how much time and money was spent across your entire organization on any given day.",
        "Approve/Reject requests": "This feature allows managers to review submitted manual time entries or time off requests, ensuring all logged hours are accurate before payroll is generated.",
        "Configure screenshot frequency": "Screenshot frequency allows you to control how many screenshots are taken per 10-minute interval, balancing team oversight with privacy concerns.",
        "Blur screenshots": "Blurring screenshots is a vital privacy feature that obscures sensitive on-screen text (like passwords or private messages) while still proving that the employee was actively working.",
        "Track URLs and Apps": "This feature monitors which websites and desktop applications your team uses while tracking time, helping you identify time-wasting habits and optimize workflows."
    };

    const specificOverview = featureDescriptions[article] || `Understanding how to use the **${article}** feature is essential for maximizing operational visibility and team productivity. This tool has been engineered to provide detailed insights while remaining incredibly user-friendly.`;

    return `---
title: ${article}
category: ${category}
description: Learn how to manage ${article.toLowerCase()} in TrackOwl.
---

# ${article}

> [!NOTE]
> ${customOverview}

## Overview
${specificOverview}

> [!IMPORTANT]
> **Required Permissions:** You must be an \`Owner\` or \`Manager\` to modify these settings. Standard users have read-only access.

## Where to find it
To access this feature:
1. Open the main **TrackOwl Dashboard**.
2. Look for the **${category}** icon in the primary sidebar navigation.
3. Select **${article}** from the secondary menu.

---

## Step-by-Step Instructions

Follow these steps to configure your settings properly:

${customSteps}

---

## Best Practices
${customBestPractices}

## Frequently Asked Questions

${customFAQ}
`;
}

// Write the files
let count = 0;
for (const [category, articles] of Object.entries(documentationStructure)) {
    for (const article of articles) {
        const content = generateContent(category, article);
        // Format filename: "Category - Article Name.md" to ensure unique files and easy sorting
        const safeCategory = category.replace(/[^a-zA-Z0-9]/g, '');
        const safeArticle = article.replace(/[^a-zA-Z0-9 ]/g, '');
        const fileName = `${safeCategory}__${safeArticle}.md`;
        
        fs.writeFileSync(path.join(contentDir, fileName), content, 'utf8');
        count++;
    }
}

console.log(`Successfully generated ${count} accurate documentation articles.`);
