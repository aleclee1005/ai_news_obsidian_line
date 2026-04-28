# AI News → LINE + Obsidian Daily Archive

A Google Apps Script (GAS) that automatically collects the latest AI news and:
- 📱 Sends daily Flex Message cards to a LINE group
- 📝 Archives each day's news as a Markdown file to an Obsidian vault via GitHub

## Features

- Fetches from 6 RSS sources daily (3 topic news + 3 official blogs)
- Deduplication: never sends the same article twice
- LINE Flex Message cards with title, summary, and "Read More" button
- Auto-archives to `AI-News/YYYY-MM-DD.md` in your Obsidian vault

## News Sources

| Source | Category |
|--------|----------|
| VentureBeat AI | Enterprise AI adoption |
| The Verge AI | Personal AI use cases |
| TechCrunch Robotics | AI robotics |
| OpenAI Blog | OpenAI official updates |
| Google AI Blog | Google / Gemini updates |
| MIT Technology Review | In-depth AI analysis |

## Setup

### 1. Prerequisites
- Google account (for GAS)
- LINE Messaging API channel
- GitHub account + Personal Access Token (repo scope)
- Obsidian with obsidian-git plugin

### 2. GitHub
Create a private repository for your Obsidian vault and clone it locally.

### 3. Google Apps Script
1. Go to [script.google.com](https://script.google.com) and create a new project
2. Paste the contents of `AINews.gs`
3. Add the following Script Properties:

| Property | Value |
|----------|-------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Your LINE channel access token |
| `LINE_GROUP_ID` | Your LINE group ID |
| `GITHUB_TOKEN` | Your GitHub Personal Access Token |

### 4. Trigger
Set a daily time-driven trigger on `sendDailyAINews` (recommended: 9:00–10:00 AM).

### 5. Obsidian
Install the **Git** community plugin and set Auto pull interval to 60 minutes.

## File Output Example

```markdown
---
date: 2026-04-28
tags: [AI, news]
---

# AI News - 2026-04-28

## 1. OpenAI available at FedRAMP Moderate
**Source:** OpenAI Blog
**Link:** https://openai.com/...
> OpenAI is now available at FedRAMP Moderate authorization...
```

## Architecture

```
GAS (daily trigger)
    ├── Fetch RSS feeds (6 sources)
    ├── Deduplicate via Script Properties
    ├── Send LINE Flex Message cards
    └── Commit YYYY-MM-DD.md to GitHub
              └── obsidian-git auto pulls → Obsidian vault
```
