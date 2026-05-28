import * as sinon from "sinon";
import * as vscode from "vscode";
import * as config from "../../config";
import { contentSearch } from "../../contentSearch";
import { stubMultiple } from "../util/stubHelpers";

export const getTestSetups = () => {
  const sandbox = sinon.createSandbox();

  return {
    afterEach: () => {
      sandbox.restore();
    },

    search: {
      setupForReturningResultsWhenQueryMatchesContent: () => {
        const testUri = vscode.Uri.parse("file:///workspace/test.vue");
        const document = {
          getText: () => "<template>FooBar</template>",
        };

        return stubMultiple(
          [
            {
              object: config,
              method: "fetchContentSearchEnabled",
              returns: true,
            },
            {
              object: config,
              method: "fetchContentSearchMaxResults",
              returns: 50,
            },
            {
              object: config,
              method: "fetchContentSearchMaxFileSizeKb",
              returns: 512,
            },
            {
              object: config,
              method: "fetchContentSearchExclude",
              returns: ["**/node_modules/**"],
            },
            {
              object: vscode.workspace,
              method: "findFiles",
              returns: Promise.resolve([testUri]),
            },
            {
              object: vscode.workspace.fs,
              method: "stat",
              returns: Promise.resolve({ size: 100 }),
            },
            {
              object: vscode.workspace,
              method: "openTextDocument",
              returns: Promise.resolve(document),
            },
          ],
          sandbox
        );
      },

      setupForReturningEmptyArrayWhenContentSearchDisabled: () => {
        return stubMultiple(
          [
            {
              object: config,
              method: "fetchContentSearchEnabled",
              returns: false,
            },
          ],
          sandbox
        );
      },

      setupForReturningEmptyArrayWhenQueryTooShort: () => {
        return stubMultiple(
          [
            {
              object: config,
              method: "fetchContentSearchEnabled",
              returns: true,
            },
          ],
          sandbox
        );
      },

      setupForReturningEmptyArrayWhenNoMatchFound: () => {
        const testUri = vscode.Uri.parse("file:///workspace/noMatch.vue");
        const document = {
          getText: () => "<template>NothingHere</template>",
        };

        return stubMultiple(
          [
            {
              object: config,
              method: "fetchContentSearchEnabled",
              returns: true,
            },
            {
              object: config,
              method: "fetchContentSearchMaxResults",
              returns: 50,
            },
            {
              object: config,
              method: "fetchContentSearchMaxFileSizeKb",
              returns: 512,
            },
            {
              object: config,
              method: "fetchContentSearchExclude",
              returns: ["**/node_modules/**"],
            },
            {
              object: vscode.workspace,
              method: "findFiles",
              returns: Promise.resolve([testUri]),
            },
            {
              object: vscode.workspace.fs,
              method: "stat",
              returns: Promise.resolve({ size: 100 }),
            },
            {
              object: vscode.workspace,
              method: "openTextDocument",
              returns: Promise.resolve(document),
            },
          ],
          sandbox
        );
      },

      setupForSkippingFilesLargerThanMaxSize: () => {
        const testUri = vscode.Uri.parse("file:///workspace/large.vue");
        const smallUri = vscode.Uri.parse("file:///workspace/small.vue");
        const document = {
          getText: () => "<template>FooBar</template>",
        };

        return stubMultiple(
          [
            {
              object: config,
              method: "fetchContentSearchEnabled",
              returns: true,
            },
            {
              object: config,
              method: "fetchContentSearchMaxResults",
              returns: 50,
            },
            {
              object: config,
              method: "fetchContentSearchMaxFileSizeKb",
              returns: 1,
            },
            {
              object: config,
              method: "fetchContentSearchExclude",
              returns: ["**/node_modules/**"],
            },
            {
              object: vscode.workspace,
              method: "findFiles",
              returns: Promise.resolve([testUri, smallUri]),
            },
            {
              object: vscode.workspace.fs,
              method: "stat",
              callsFake: (uri: vscode.Uri) => {
                if (uri.path.includes("large")) {
                  return Promise.resolve({ size: 999999 });
                }
                return Promise.resolve({ size: 100 });
              },
            },
            {
              object: vscode.workspace,
              method: "openTextDocument",
              returns: Promise.resolve(document),
            },
          ],
          sandbox
        );
      },

      setupForRespectingMaxResults: () => {
        const uris = [
          vscode.Uri.parse("file:///workspace/file1.vue"),
          vscode.Uri.parse("file:///workspace/file2.vue"),
          vscode.Uri.parse("file:///workspace/file3.vue"),
        ];
        const document = {
          getText: () => "<template>FooBar</template>",
        };

        return stubMultiple(
          [
            {
              object: config,
              method: "fetchContentSearchEnabled",
              returns: true,
            },
            {
              object: config,
              method: "fetchContentSearchMaxResults",
              returns: 1,
            },
            {
              object: config,
              method: "fetchContentSearchMaxFileSizeKb",
              returns: 512,
            },
            {
              object: config,
              method: "fetchContentSearchExclude",
              returns: ["**/node_modules/**"],
            },
            {
              object: vscode.workspace,
              method: "findFiles",
              returns: Promise.resolve(uris),
            },
            {
              object: vscode.workspace.fs,
              method: "stat",
              returns: Promise.resolve({ size: 100 }),
            },
            {
              object: vscode.workspace,
              method: "openTextDocument",
              returns: Promise.resolve(document),
            },
          ],
          sandbox
        );
      },

      setupForPerformingCaseInsensitiveSearch: () => {
        const testUri = vscode.Uri.parse("file:///workspace/test.vue");
        const document = {
          getText: () => "<template>FOOBAR</template>",
        };

        return stubMultiple(
          [
            {
              object: config,
              method: "fetchContentSearchEnabled",
              returns: true,
            },
            {
              object: config,
              method: "fetchContentSearchMaxResults",
              returns: 50,
            },
            {
              object: config,
              method: "fetchContentSearchMaxFileSizeKb",
              returns: 512,
            },
            {
              object: config,
              method: "fetchContentSearchExclude",
              returns: ["**/node_modules/**"],
            },
            {
              object: vscode.workspace,
              method: "findFiles",
              returns: Promise.resolve([testUri]),
            },
            {
              object: vscode.workspace.fs,
              method: "stat",
              returns: Promise.resolve({ size: 100 }),
            },
            {
              object: vscode.workspace,
              method: "openTextDocument",
              returns: Promise.resolve(document),
            },
          ],
          sandbox
        );
      },
    },

    buildExcludeGlob: {
      setupForBuildingSinglePattern: () => {
        return stubMultiple([], sandbox);
      },

      setupForBuildingMultiplePatterns: () => {
        return stubMultiple([], sandbox);
      },
    },
  };
};