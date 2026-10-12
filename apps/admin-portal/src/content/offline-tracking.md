---
title: Offline tracking
category: Desktop App
description: What happens to tracked time when the connection drops.
---

# Offline tracking

## Overview
Losing a connection does not stop tracking. The desktop app keeps recording to a local database on the machine and marks what has not been sent yet. When the connection comes back, it syncs on its own. There is nothing to switch on and nothing to press.

What keeps being recorded while offline:
- Time against the running session
- Activity, including keyboard and mouse counts
- The app and site in use
- Screenshots, queued locally until they can be uploaded

> [!IMPORTANT]
> **Who can do this:** Every role tracks the same way. There is no setting for offline behaviour.

---

## Step-by-Step Instructions

1. Keep the desktop app running and the timer going. Work as normal.
2. When the machine is back online, leave the app open for a few minutes.
3. Check **Timesheets** in the dashboard to confirm the time arrived.
4. For screenshots, check **Activity → Screenshots** for the same dates.

---

## Best Practices
> [!TIP]
> - Do not uninstall or reset the app while work is still waiting to sync; that is where the record lives.
> - Blocks captured offline are marked as such, so a gap in a report usually means a sync that has not finished.

## Frequently Asked Questions

**Q: How long can it stay offline?**
A: There is no fixed limit. The local database holds the work until it can be sent.

**Q: Do I lose screenshots taken offline?**
A: No. They are queued on the machine and uploaded once the connection returns.
