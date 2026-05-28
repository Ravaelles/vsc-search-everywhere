import * as vscode from "vscode";

const SETTINGS_SECTION = "searchAnywhere";
const EXCLUDE_KEY = "exclude";
const CONTENT_EXCLUDE_KEY = "contentSearch.exclude";

interface ExcludeQuickPickItem extends vscode.QuickPickItem {
  action:
    | "toggle-source"
    | "toggle-type"
    | "add-pattern"
    | "remove-pattern"
    | "open-settings"
    | "back";
  source?: "indexing" | "content" | "both";
  pattern?: string;
}

interface PatternQuickPickItem extends vscode.QuickPickItem {
  pattern: string;
  source: "indexing" | "content" | "both";
  enabled: boolean;
}

function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(SETTINGS_SECTION);
}

function getIndexingExcludePatterns(): string[] {
  const config = getConfig();
  return config.get<string[]>(EXCLUDE_KEY, []);
}

function getContentExcludePatterns(): string[] {
  const config = getConfig();
  return config.get<string[]>(CONTENT_EXCLUDE_KEY, []);
}

function buildPatternMap(): Map<
  string,
  { indexing: boolean; content: boolean }
> {
  const map = new Map<string, { indexing: boolean; content: boolean }>();
  const indexingPatterns = getIndexingExcludePatterns();
  const contentPatterns = getContentExcludePatterns();

  for (const p of indexingPatterns) {
    map.set(p, { indexing: true, content: false });
  }
  for (const p of contentPatterns) {
    const existing = map.get(p);
    if (existing) {
      existing.content = true;
    } else {
      map.set(p, { indexing: false, content: true });
    }
  }

  return map;
}

function getSourceLabel(source: "indexing" | "content" | "both"): string {
  switch (source) {
    case "indexing":
      return "$(folder) Indexing";
    case "content":
      return "$(file-text) Content";
    case "both":
      return "$(layers) Both";
  }
}

function getStatusIcon(enabled: boolean): string {
  return enabled ? "$(check)" : "$(close)";
}

async function showMainMenu(): Promise<void> {
  const patternMap = buildPatternMap();
  const totalPatterns = patternMap.size;

  const items: ExcludeQuickPickItem[] = [
    {
      label: "$(list-unordered) View & Manage Exclude Patterns",
      description: `${totalPatterns} patterns configured`,
      detail: "Toggle, add, or remove exclude patterns for indexing and content search",
      action: "toggle-source",
    },
    {
      label: "$(add) Add New Exclude Pattern",
      description: "",
      detail: "Add a glob pattern to exclude from indexing, content search, or both",
      action: "add-pattern",
    },
    {
      label: "$(trash) Remove Exclude Pattern",
      description: "",
      detail: "Remove a pattern from exclude lists",
      action: "remove-pattern",
    },
    {
      label: "$(settings) Open VS Code Settings",
      description: "",
      detail: "Open the full extension settings page in VS Code Settings UI",
      action: "open-settings",
    },
  ];

  const quickPick = vscode.window.createQuickPick<ExcludeQuickPickItem>();
  quickPick.title = "$(shield) Search Anywhere — Exclude Settings";
  quickPick.placeholder = "Choose an action...";
  quickPick.items = items;

  return new Promise<void>((resolve) => {
    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0];
      quickPick.hide();

      if (selected) {
        switch (selected.action) {
          case "toggle-source":
            await showPatternList();
            break;
          case "add-pattern":
            await showAddPattern();
            break;
          case "remove-pattern":
            await showRemovePattern();
            break;
          case "open-settings":
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "@ext:ravaelles.search-anywhere"
            );
            break;
        }
      }
      resolve();
    });

    quickPick.onDidHide(() => {
      quickPick.dispose();
      resolve();
    });

    quickPick.show();
  });
}

async function showPatternList(): Promise<void> {
  const patternMap = buildPatternMap();

  const items: PatternQuickPickItem[] = [];
  for (const [pattern, status] of patternMap.entries()) {
    const source: "indexing" | "content" | "both" =
      status.indexing && status.content
        ? "both"
        : status.indexing
        ? "indexing"
        : "content";

    items.push({
      label: `${getStatusIcon(true)} ${pattern}`,
      description: getSourceLabel(source),
      detail: `Click to toggle scope (indexing/content/both/off)`,
      pattern,
      source,
      enabled: true,
    });
  }

  // Sort alphabetically
  items.sort((a, b) => a.pattern.localeCompare(b.pattern));

  const quickPick = vscode.window.createQuickPick<PatternQuickPickItem>();
  quickPick.title = "$(list-unordered) Exclude Patterns — Click to toggle";
  quickPick.placeholder = "Select a pattern to toggle its scope...";
  quickPick.items = items;

  return new Promise<void>((resolve) => {
    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0];
      if (selected) {
        await togglePatternScope(selected.pattern, selected.source);
        quickPick.hide();
        // Re-show the list after toggling
        await showPatternList();
      }
      resolve();
    });

    quickPick.onDidHide(() => {
      quickPick.dispose();
      resolve();
    });

    quickPick.show();
  });
}

async function togglePatternScope(
  pattern: string,
  currentSource: "indexing" | "content" | "both"
): Promise<void> {
  const options: vscode.QuickPickItem[] = [
    {
      label: "$(layers) Both (Indexing + Content)",
      description: currentSource === "both" ? "$(check) current" : "",
    },
    {
      label: "$(folder) Indexing only",
      description: currentSource === "indexing" ? "$(check) current" : "",
    },
    {
      label: "$(file-text) Content only",
      description: currentSource === "content" ? "$(check) current" : "",
    },
    {
      label: "$(close) Remove from all",
      description: "Remove this pattern from all exclude lists",
    },
  ];

  const selected = await vscode.window.showQuickPick(options, {
    title: `Toggle scope for: ${pattern}`,
    placeHolder: "Choose where to apply this exclude pattern...",
  });

  if (!selected) return;

  const config = getConfig();
  let indexingPatterns = getIndexingExcludePatterns();
  let contentPatterns = getContentExcludePatterns();

  // Remove from both first
  indexingPatterns = indexingPatterns.filter((p) => p !== pattern);
  contentPatterns = contentPatterns.filter((p) => p !== pattern);

  if (selected.label.includes("Both")) {
    indexingPatterns.push(pattern);
    contentPatterns.push(pattern);
  } else if (selected.label.includes("Indexing")) {
    indexingPatterns.push(pattern);
  } else if (selected.label.includes("Content")) {
    contentPatterns.push(pattern);
  }
  // "Remove from all" — already removed above

  await config.update(
    EXCLUDE_KEY,
    indexingPatterns,
    vscode.ConfigurationTarget.Global
  );
  await config.update(
    CONTENT_EXCLUDE_KEY,
    contentPatterns,
    vscode.ConfigurationTarget.Global
  );

  if (selected.label.includes("Remove")) {
    vscode.window.showInformationMessage(
      `Removed "${pattern}" from all exclude lists.`
    );
  } else {
    vscode.window.showInformationMessage(
      `Updated "${pattern}" exclude scope.`
    );
  }
}

async function showAddPattern(): Promise<void> {
  const pattern = await vscode.window.showInputBox({
    title: "$(add) Add Exclude Pattern",
    prompt:
      "Enter a glob pattern (e.g. **/node_modules/**, **/public/build/**)",
    placeHolder: "**/my-folder/**",
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return "Pattern cannot be empty";
      }
      return null;
    },
  });

  if (!pattern) return;

  const scope = await vscode.window.showQuickPick(
    [
      {
        label: "$(layers) Both (Indexing + Content)",
        description: "Exclude from file indexing and content search",
        value: "both" as const,
      },
      {
        label: "$(folder) Indexing only",
        description: "Exclude from file/symbol indexing only",
        value: "indexing" as const,
      },
      {
        label: "$(file-text) Content only",
        description: "Exclude from content search only",
        value: "content" as const,
      },
    ],
    {
      title: `Where to exclude "${pattern}"?`,
      placeHolder: "Choose scope...",
    }
  );

  if (!scope) return;

  const config = getConfig();
  let indexingPatterns = getIndexingExcludePatterns();
  let contentPatterns = getContentExcludePatterns();

  const addedTo: string[] = [];

  if (scope.value === "both" || scope.value === "indexing") {
    if (!indexingPatterns.includes(pattern)) {
      indexingPatterns.push(pattern);
      addedTo.push("indexing");
    }
  }
  if (scope.value === "both" || scope.value === "content") {
    if (!contentPatterns.includes(pattern)) {
      contentPatterns.push(pattern);
      addedTo.push("content search");
    }
  }

  if (addedTo.length === 0) {
    vscode.window.showWarningMessage(
      `Pattern "${pattern}" already exists in the selected scope.`
    );
    return;
  }

  await config.update(
    EXCLUDE_KEY,
    indexingPatterns,
    vscode.ConfigurationTarget.Global
  );
  await config.update(
    CONTENT_EXCLUDE_KEY,
    contentPatterns,
    vscode.ConfigurationTarget.Global
  );

  vscode.window.showInformationMessage(
    `Added "${pattern}" to ${addedTo.join(" and ")} exclude list(s).`
  );
}

async function showRemovePattern(): Promise<void> {
  const patternMap = buildPatternMap();

  if (patternMap.size === 0) {
    vscode.window.showInformationMessage("No exclude patterns configured.");
    return;
  }

  const items: PatternQuickPickItem[] = [];
  for (const [pattern, status] of patternMap.entries()) {
    const source: "indexing" | "content" | "both" =
      status.indexing && status.content
        ? "both"
        : status.indexing
        ? "indexing"
        : "content";

    items.push({
      label: `$(trash) ${pattern}`,
      description: getSourceLabel(source),
      detail: "Click to remove this pattern",
      pattern,
      source,
      enabled: true,
    });
  }

  items.sort((a, b) => a.pattern.localeCompare(b.pattern));

  const selected = await vscode.window.showQuickPick(items, {
    title: "$(trash) Remove Exclude Pattern",
    placeHolder: "Select a pattern to remove...",
    canPickMany: true,
  });

  if (!selected || selected.length === 0) return;

  const config = getConfig();
  let indexingPatterns = getIndexingExcludePatterns();
  let contentPatterns = getContentExcludePatterns();

  const removed: string[] = [];
  for (const item of selected) {
    const idx1 = indexingPatterns.indexOf(item.pattern);
    if (idx1 !== -1) {
      indexingPatterns.splice(idx1, 1);
      removed.push(item.pattern);
    }
    const idx2 = contentPatterns.indexOf(item.pattern);
    if (idx2 !== -1) {
      contentPatterns.splice(idx2, 1);
    }
  }

  await config.update(
    EXCLUDE_KEY,
    indexingPatterns,
    vscode.ConfigurationTarget.Global
  );
  await config.update(
    CONTENT_EXCLUDE_KEY,
    contentPatterns,
    vscode.ConfigurationTarget.Global
  );

  vscode.window.showInformationMessage(
    `Removed ${removed.length} exclude pattern(s).`
  );
}

export const settingsMenu = {
  show: showMainMenu,
};