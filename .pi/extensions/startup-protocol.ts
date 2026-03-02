import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

/**
 * Startup Protocol Extension
 * 
 * Loads project documentation and core skills into context as durable memory.
 * Note: SYSTEM.md is loaded automatically by pi (defines agent identity).
 * Note: AGENTS.md is loaded automatically by pi (defines project workflow).
 * This extension adds docs/* and always-on skills for additional project context.
 * 
 * Also checks for pending X account scans based on last scan time.
 */
export default function (pi: ExtensionAPI) {
  const loadProjectDocs = (cwd: string) => {
    const files = [
      { path: "docs/prompt.md", label: "Spec" },
      { path: "docs/plans.md", label: "Plans" },
      { path: "docs/implement.md", label: "Runbook" },
      { path: "docs/status.md", label: "Status" },
    ];

    const loaded: string[] = [];
    const contents: string[] = [];

    for (const file of files) {
      const fullPath = path.join(cwd, file.path);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        contents.push(`\n\n--- ${file.label.toUpperCase()} (${file.path}) ---\n${content}`);
        loaded.push(file.label);
      }
    }

    return { loaded, content: contents.join("\n") };
  };

  const loadAlwaysOnSkills = (cwd: string) => {
    // Skills that should be loaded on every session startup
    const alwaysOnSkills = [
      { path: ".pi/skills/context-engineering/SKILL.md", label: "Context Engineering" },
    ];

    const loaded: string[] = [];
    const contents: string[] = [];

    for (const skill of alwaysOnSkills) {
      const fullPath = path.join(cwd, skill.path);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        contents.push(`\n\n--- SKILL: ${skill.label.toUpperCase()} (${skill.path}) ---\n${content}`);
        loaded.push(skill.label);
      }
    }

    return { loaded, content: contents.join("\n") };
  };

  // Inject docs and always-on skills into system prompt context
  pi.on("before_agent_start", async (event, ctx) => {
    const docs = loadProjectDocs(ctx.cwd);
    const skills = loadAlwaysOnSkills(ctx.cwd);
    
    const allLoaded = [...docs.loaded, ...skills.loaded];
    const allContent = [docs.content, skills.content].filter(Boolean).join("\n");
    
    if (allContent && allLoaded.length > 0) {
      const injectedPrompt = `
## PROJECT DOCUMENTATION (Auto-loaded)

${docs.content}

---
END PROJECT DOCUMENTATION
---

## ALWAYS-ON SKILLS (Auto-loaded)

${skills.content}

---
END ALWAYS-ON SKILLS
---
`;
      
      return {
        systemPrompt: event.systemPrompt + "\n" + injectedPrompt,
      };
    }
  });

  // Check X account scan status
  const checkXScanStatus = (cwd: string): { account: string; needsScan: boolean; lastScan: string | null }[] => {
    const watchlistPath = path.join(cwd, "data/watchlist.json");
    const results: { account: string; needsScan: boolean; lastScan: string | null }[] = [];
    
    if (!fs.existsSync(watchlistPath)) {
      return results;
    }
    
    try {
      const watchlist = JSON.parse(fs.readFileSync(watchlistPath, "utf-8"));
      const subcategories = watchlist.subcategories || {};
      
      for (const [key, value] of Object.entries(subcategories)) {
        if (key.startsWith("@")) {
          const account = key.slice(1);
          const lastScan = (value as any).last_scan || null;
          
          // Check if scan is needed (more than 12 hours old or never scanned)
          let needsScan = !lastScan;
          
          if (lastScan) {
            const lastScanDate = new Date(lastScan);
            const now = new Date();
            const hoursSinceLastScan = (now.getTime() - lastScanDate.getTime()) / (1000 * 60 * 60);
            needsScan = hoursSinceLastScan > 12;
          }
          
          results.push({ account, needsScan, lastScan });
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    return results;
  };

  // Notify on session start
  pi.on("session_start", async (_event, ctx) => {
    const docs = loadProjectDocs(ctx.cwd);
    const skills = loadAlwaysOnSkills(ctx.cwd);
    const xScans = checkXScanStatus(ctx.cwd);
    
    const allLoaded = [...docs.loaded, ...skills.loaded];
    
    if (allLoaded.length > 0) {
      ctx.ui.notify(`Loaded: ${allLoaded.join(", ")}`, "info");
    }
    
    // Check for pending X scans
    const pendingScans = xScans.filter(s => s.needsScan);
    if (pendingScans.length > 0) {
      const accounts = pendingScans.map(s => `@${s.account}`).join(", ");
      ctx.ui.notify(`⏰ X scan needed: ${accounts}`, "warning");
    }
  });
}
