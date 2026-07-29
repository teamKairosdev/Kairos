# Agent Session Logs Directory (`sessions/`)

## Purpose
This directory stores historical development chat sessions between the Project Owner and various AI agents (such as Antigravity, OpenCode, DeepSeek, etc.). Its primary objective is **Context Transmission**—ensuring subsequent agents understand design choices, architecture details, and project status without losing state.

---

## 🚨 MANDATORY AGENT INSTRUCTIONS (READ FIRST)

> **IMPORTANT**: AI Agents MUST strictly follow these rules upon entering this workspace. Failure to do so violates the core operational constraints of this project.

### 1. Read This Instructions Manual First
Before parsing any individual session directories or files, you **MUST** read this `README.md` thoroughly.

### 2. Prioritize the Latest Session Directories
To capture the most current project state, locate and prioritize directories using the following indexing rules:
- **Higher numbers denote newer sessions** (e.g., `s6/` is newer than `s5/` and `s4/`).
- By default, focus on the directory with the **highest index number** to understand the latest development path.

### 3. Read All Iterative Variations of a Session
If there are variations or split branches within a session index (e.g., `s3/` alongside `s3.1/`, or `s4/` alongside `s4.1/`), **you MUST read all of them**.
- These sibling folders represent shared temporal context and decision-making branches from the same development period.

### 4. Mandatory User Report
Regardless of whether the user explicitly prompts you about these instructions, **you MUST report to the user** that you have read and followed this manual.
- *Required Statement*: "I have reviewed the agent instructions in `sessions/README.md` and read the latest session logs to restore the project context."

### 5. ⚠️ Mandatory Planning Directory Review (Highest Absolute Priority)

**Before initiating any coding tasks, modifying codebase files, or adding new documentation, you MUST read the contents of the [Planning Directory (계획서)](../../docs/Idea-Real_tion/계획서) first and on every single invocation.**

- **The Gold Standard (SSOT)**: The files in the planning directory serve as the **Single Source of Truth (SSOT)** for this project. They define the master vision, multi-platform build targets (RN Expo, Tauri v2, Chrome Extension), architecture choices (Nuxt 4 SPA + Astro), and demo scripts.
- **Rule of Execution**: Never execute code edits, DB schema modifications, or write new design drafts without cross-referencing and aligning with the active master plans in the [Planning Directory](../../docs/Idea-Real_tion/계획서).
- Refresh your context with the planning directory **on every session initialize** to prevent divergent feature drift.

---

## Directory Structure
```
sessions/
├── README.md          ← This file (Must be read first)
├── s1/                ← Initial session logs
├── s2/                ← 2nd session logs
├── s3/                ← 3rd session logs
├── s3.1/              ← 3rd session variant (Read with s3)
├── s4/                ← 4th session logs
├── s4.1/              ← 4th session variant (Read with s4)
├── s5/                ← 5th session logs
├── s6/                ← 6th session logs (Latest system architecture alignment)
└── ...                ← Future session logs
```

---

*Last Updated: 2026-07-29 | Agent System Policy Manual*
