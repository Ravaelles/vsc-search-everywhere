import * as vscode from "vscode";
import {
  fetchContentSearchEnabled,
  fetchContentSearchExclude,
  fetchContentSearchMaxResults,
  fetchContentSearchMaxFileSizeKb,
} from "./config";
import { QuickPickItem } from "./types";
import { utils } from "./utils";

let currentSearchId = 0;

async function search(query: string): Promise<QuickPickItem[]> {
  if (!query || query.length < 2) {
    return [];
  }

  if (!fetchContentSearchEnabled()) {
    return [];
  }

  const searchId = ++currentSearchId;
  const maxResults = fetchContentSearchMaxResults();
  const maxFileSizeKb = fetchContentSearchMaxFileSizeKb();
  const excludePatterns = fetchContentSearchExclude();

  const excludePattern = buildExcludeGlob(excludePatterns);
  const files = await vscode.workspace.findFiles("**/*", excludePattern);

  const results: QuickPickItem[] = [];
  const queryLower = query.toLowerCase();

  for (const uri of files) {
    if (searchId !== currentSearchId) {
      return [];
    }

    if (results.length >= maxResults) {
      break;
    }

    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > maxFileSizeKb * 1024) {
        continue;
      }

      const doc = await vscode.workspace.openTextDocument(uri);
      const text = doc.getText();
      const lines = text.split("\n");

      for (let i = 0; i < lines.length; i++) {
        if (searchId !== currentSearchId) {
          return [];
        }

        const line = lines[i];
        const lineLower = line.toLowerCase();
        const matchIndex = lineLower.indexOf(queryLower);

        if (matchIndex !== -1) {
          const trimmedLine = line.trim();
          const displayName = utils.getNameFromUri(uri);
          const normalizedPath = utils.normalizeUriPath(uri.path);

          results.push({
            uri: uri,
            symbolKind: -1,
            isContentMatch: true,
            label: `$(search)  ${displayName}`,
            description: `Content at line ${i + 1}: ${trimmedLine.substring(0, 80)}${trimmedLine.length > 80 ? "..." : ""}`,
            detail: normalizedPath,
            range: {
              start: new vscode.Position(i, matchIndex),
              end: new vscode.Position(i, matchIndex + query.length),
            },
            buttons: [
              {
                iconPath: new vscode.ThemeIcon("open-preview"),
                tooltip: "Open to the side",
              },
            ],
          } as QuickPickItem);

          if (results.length >= maxResults) {
            break;
          }
        }
      }
    } catch (e) {
      // Skip files that cannot be opened as text
      continue;
    }
  }

  return results;
}

function buildExcludeGlob(patterns: string[]): string {
  if (!patterns || patterns.length === 0) {
    return "**/node_modules/**";
  }

  if (patterns.length === 1) {
    return patterns[0];
  }

  return `{${patterns.join(",")}}`;
}

export const contentSearch = {
  search,
};