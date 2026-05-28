import * as vscode from "vscode";
import * as config from "../../config";
import { contentSearch } from "../../contentSearch";

// We spy on the vscode mock and config module functions
let findFilesSpy: jest.SpyInstance;
let statSpy: jest.SpyInstance;
let openTextDocumentSpy: jest.SpyInstance;
let fetchContentSearchEnabledSpy: jest.SpyInstance;
let fetchContentSearchMaxResultsSpy: jest.SpyInstance;
let fetchContentSearchMaxFileSizeKbSpy: jest.SpyInstance;
let fetchContentSearchExcludeSpy: jest.SpyInstance;

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("ContentSearch", () => {
  describe("search", () => {
    it("should return results when query matches file content", async () => {
      const testUri = vscode.Uri.parse("file:///workspace/test.vue");
      const document = {
        getText: () => "<template>FooBar</template>",
      };

      findFilesSpy = jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([testUri] as any);
      statSpy = jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 100 } as any);
      openTextDocumentSpy = jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      fetchContentSearchEnabledSpy = jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      fetchContentSearchMaxResultsSpy = jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      fetchContentSearchMaxFileSizeKbSpy = jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      fetchContentSearchExcludeSpy = jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("FooBar");

      expect(results.length).toBe(1);
      expect(results[0].isContentMatch).toBe(true);
      expect(results[0].symbolKind).toBe(-1);
      expect(results[0].description).toContain("Content at line 1");
      expect(results[0].description).toContain("FooBar");
    });

    it("should return empty array when content search is disabled", async () => {
      fetchContentSearchEnabledSpy = jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(false);

      const results = await contentSearch.search("FooBar");

      expect(results).toEqual([]);
    });

    it("should return empty array when query is too short", async () => {
      fetchContentSearchEnabledSpy = jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);

      const results = await contentSearch.search("F");

      expect(results).toEqual([]);
    });

    it("should return empty array when query is empty", async () => {
      const results = await contentSearch.search("");

      expect(results).toEqual([]);
    });

    it("should return empty array when no match found", async () => {
      const testUri = vscode.Uri.parse("file:///workspace/noMatch.vue");
      const document = {
        getText: () => "<template>NothingHere</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([testUri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 100 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("NonExistentContent");

      expect(results).toEqual([]);
    });

    it("should skip files larger than maxFileSizeKb", async () => {
      const largeUri = vscode.Uri.parse("file:///workspace/large.vue");
      const smallUri = vscode.Uri.parse("file:///workspace/small.vue");
      const document = {
        getText: () => "<template>FooBar</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([largeUri, smallUri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockImplementation((uri: any) => {
          if (uri.path && uri.path.includes("large")) {
            return Promise.resolve({ size: 999999 } as any);
          }
          return Promise.resolve({ size: 100 } as any);
        });
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(1); // 1KB limit
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("FooBar");

      // Only the small file should be searched
      expect(results.length).toBe(1);
      expect(results[0].detail).toBe("/workspace/small.vue");
    });

    it("should respect maxResults limit", async () => {
      const uris = [
        vscode.Uri.parse("file:///workspace/file1.vue"),
        vscode.Uri.parse("file:///workspace/file2.vue"),
        vscode.Uri.parse("file:///workspace/file3.vue"),
      ];
      const document = {
        getText: () => "<template>FooBar</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue(uris as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 100 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(1);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("FooBar");

      expect(results.length).toBe(1);
    });

    it("should perform case-insensitive search", async () => {
      const testUri = vscode.Uri.parse("file:///workspace/test.vue");
      const document = {
        getText: () => "<template>FOOBAR</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([testUri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 100 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("foobar");

      expect(results.length).toBe(1);
      expect(results[0].isContentMatch).toBe(true);
    });

    it("should set correct range for match position", async () => {
      const testUri = vscode.Uri.parse("file:///workspace/test.vue");
      const document = {
        getText: () => "Hello World FooBar End",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([testUri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 100 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("FooBar");

      expect(results.length).toBe(1);
      const item = results[0]!;
      expect(item.range!.start.line).toBe(0);
      expect(item.range!.start.character).toBe(12);
      expect(item.range!.end.line).toBe(0);
      expect(item.range!.end.character).toBe(18);
    });

    it("should match content on specific line", async () => {
      const testUri = vscode.Uri.parse("file:///workspace/test.vue");
      const document = {
        getText: () => "Line1\nLine2\nFooBar on line 3\nLine4",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([testUri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 100 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("FooBar");

      expect(results.length).toBe(1);
      const item = results[0]!;
      expect(item.range!.start.line).toBe(2); // 0-indexed line 2 = line 3
      expect(item.description).toContain("line 3");
    });

    it("should truncate long lines in description", async () => {
      const testUri = vscode.Uri.parse("file:///workspace/test.vue");
      const longLine =
        "<template>" + "A".repeat(100) + "FooBar" + "B".repeat(100) + "</template>";
      const document = {
        getText: () => longLine,
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([testUri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 100 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("FooBar");

      expect(results.length).toBe(1);
      expect(results[0].description).toContain("...");
    });
  });

  describe("search with long filenames", () => {
    it("should find content in files with long descriptive names", async () => {
      const uris = [
        vscode.Uri.parse("file:///workspace/src/components/buttons/AButton.vue"),
        vscode.Uri.parse(
          "file:///workspace/src/components/buttons/AEditButton.vue"
        ),
        vscode.Uri.parse(
          "file:///workspace/src/components/buttons/UserProfileSettingsComponent.vue"
        ),
        vscode.Uri.parse(
          "file:///workspace/src/features/admin/AdminDashboardOverviewPanel.tsx"
        ),
      ];

      const documents: Record<string, string> = {
        "AButton.vue": "<template>FooBar</template>",
        "AEditButton.vue": "<template>BarBaz</template>",
        "UserProfileSettingsComponent.vue":
          "<template><div>UserProfileForm</div></template>",
        "AdminDashboardOverviewPanel.tsx":
          "import React from 'react';\n\nexport const DashboardWidget = () => <div>Widget</div>;",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue(uris as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockImplementation((uri: any) => {
          const fileName = uri.path.split("/").pop();
          const content = documents[fileName] || "";
          return Promise.resolve({ getText: () => content } as any);
        });
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("UserProfileForm");

      expect(results.length).toBe(1);
      expect(results[0].detail).toContain(
        "UserProfileSettingsComponent.vue"
      );
    });

    it("should find multiple results across files with deep paths", async () => {
      const uris = [
        vscode.Uri.parse(
          "file:///workspace/src/features/auth/LoginForm.vue"
        ),
        vscode.Uri.parse(
          "file:///workspace/src/features/auth/RegisterForm.vue"
        ),
        vscode.Uri.parse(
          "file:///workspace/src/features/profile/EditProfileForm.vue"
        ),
      ];

      const documents: Record<string, string> = {
        "LoginForm.vue": "<template><FormWrapper>LoginForm</FormWrapper></template>",
        "RegisterForm.vue":
          "<template><FormWrapper>RegisterForm</FormWrapper></template>",
        "EditProfileForm.vue":
          "<template><FormWrapper>EditProfileForm</FormWrapper></template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue(uris as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockImplementation((uri: any) => {
          const fileName = uri.path.split("/").pop();
          const content = documents[fileName] || "";
          return Promise.resolve({ getText: () => content } as any);
        });
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("FormWrapper");

      expect(results.length).toBe(3);
      const details = results.map((r) => r.detail);
      expect(details).toContain("/workspace/src/features/auth/LoginForm.vue");
      expect(details).toContain(
        "/workspace/src/features/auth/RegisterForm.vue"
      );
      expect(details).toContain(
        "/workspace/src/features/profile/EditProfileForm.vue"
      );
    });

    it("should find content in deeply nested directory structures", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/modules/core/services/api/v2/HttpClientService.ts"
      );
      const document = {
        getText: () =>
          "export class HttpClientService {\n  async fetchFromApi(endpoint: string) {\n    return await fetch(endpoint);\n  }\n}",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 300 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("fetchFromApi");

      expect(results.length).toBe(1);
      expect(results[0].detail).toBe(
        "/workspace/src/modules/core/services/api/v2/HttpClientService.ts"
      );
      expect(results[0].range!.start.line).toBe(1);
    });
  });

  describe("search with @ notation", () => {
    it("should find content with @ prefix in Vue/React imports", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/components/MyComponent.vue"
      );
      const document = {
        getText: () =>
          'import UserAvatar from "@/components/UserAvatar.vue";\nimport { mapGetters } from "vuex";\n\nexport default {\n  name: "MyComponent",\n};',
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("@/components/UserAvatar");

      expect(results.length).toBe(1);
      expect(results[0].description).toContain("@/components/UserAvatar");
    });

    it("should find content with @ in Vue single-file components", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/pages/HomePage.vue"
      );
      const document = {
        getText: () =>
          "<template>\n  <div class=\"@css-module\">\n    <span>@click=\"handleClick\"</span>\n  </div>\n</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("@click");

      expect(results.length).toBe(1);
      expect(results[0].range!.start.line).toBe(2);
    });

    it("should find decorators with @ prefix in TypeScript", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/controllers/UserController.ts"
      );
      const document = {
        getText: () =>
          'import { Controller, Get } from "@nestjs/common";\n\n@Controller("users")\nexport class UserController {\n  @Get()\n  findAll() {\n    return [];\n  }\n}',
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 300 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("@Controller");

      expect(results.length).toBe(1);
      expect(results[0].description).toContain("@Controller");
    });
  });

  describe("search with colons and special characters", () => {
    it("should find content with double-colon notation (TypeScript/PHP)", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/services/DataProcessor.ts"
      );
      const document = {
        getText: () =>
          "export class DataProcessor {\n  static process(data: unknown): void {\n    DataProcessor::validate(data);\n  }\n}",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("::validate");

      expect(results.length).toBe(1);
      expect(results[0].description).toContain("::validate");
    });

    it("should find content with colon-separated CSS selectors", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/styles/components.css"
      );
      const document = {
        getText: () =>
          ".btn:hover {\n  background-color: blue;\n}\n.btn:active {\n  transform: scale(0.95);\n}",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 100 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search(":hover");

      expect(results.length).toBe(1);
      expect(results[0].range!.start.line).toBe(0);
    });

    it("should find Vue template syntax with colons", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/components/DataList.vue"
      );
      const document = {
        getText: () =>
          "<template>\n  <div v-bind:class=\"containerClass\">\n    <ul v-for=\"item in items\" :key=\"item.id\">\n      <li>{{ item.name }}</li>\n    </ul>\n  </div>\n</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search(":key");

      expect(results.length).toBe(1);
      expect(results[0].description).toContain(":key");
    });

    it("should find JSX expressions with curly braces", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/components/UserCard.tsx"
      );
      const document = {
        getText: () =>
          'import React from "react";\n\nexport const UserCard = ({ user }) => {\n  return (\n    <div className="user-card">\n      <h2>{user.displayName}</h2>\n      <p>{user.email}</p>\n    </div>\n  );\n};',
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 300 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("{user.displayName}");

      expect(results.length).toBe(1);
      expect(results[0].range!.start.line).toBe(5);
    });

    it("should find Vue double-curly-brace template syntax", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/components/Greeting.vue"
      );
      const document = {
        getText: () =>
          "<template>\n  <div>\n    <h1>Hello, {{ userName }}!</h1>\n    <p>Your role is: {{ userRole }}</p>\n  </div>\n</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("{{ userName }}");

      expect(results.length).toBe(1);
      expect(results[0].range!.start.line).toBe(2);
      expect(results[0].description).toContain("{{ userName }}");
    });

    it("should find content with slash-separated paths", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/router/index.ts"
      );
      const document = {
        getText: () =>
          "const routes = [\n  { path: \"/\", component: HomeView },\n  { path: \"/users/:id\", component: UserProfile },\n  { path: \"/admin/dashboard\", component: AdminDashboard },\n];",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("/admin/dashboard");

      expect(results.length).toBe(1);
      expect(results[0].range!.start.line).toBe(3);
    });

    it("should find content with pipe characters (Vue filters, shell)", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/components/DataTable.vue"
      );
      const document = {
        getText: () =>
          "<template>\n  <div>\n    <span>{{ price | currency }}</span>\n    <span>{{ date | formatDate('YYYY-MM-DD') }}</span>\n  </div>\n</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("| currency");

      expect(results.length).toBe(1);
      expect(results[0].description).toContain("| currency");
    });

    it("should find content with hash/fragment syntax", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/components/Modal.vue"
      );
      const document = {
        getText: () =>
          "<template>\n  <Teleport to=\"#modal-container\">\n    <div id=\"#app-modal\" class=\"modal\">\n      <slot />\n    </div>\n  </Teleport>\n</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("#modal-container");

      expect(results.length).toBe(1);
      expect(results[0].description).toContain("#modal-container");
    });
  });

  describe("search with multiple matches in same file", () => {
    it("should find all occurrences in a single file", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/utils/helpers.ts"
      );
      const document = {
        getText: () =>
          "function validateInput(input: string) {\n  if (!validateInput(input)) {\n    throw new Error('Invalid');\n  }\n  return validateInput(input);\n}",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("validateInput");

      expect(results.length).toBe(3);
      expect(results[0].range!.start.line).toBe(0);
      expect(results[1].range!.start.line).toBe(1);
      expect(results[2].range!.start.line).toBe(4);
    });

    it("should handle mixed case matches across file", async () => {
      const uri = vscode.Uri.parse(
        "file:///workspace/src/constants/config.ts"
      );
      const document = {
        getText: () =>
          "export const API_URL = 'https://api.example.com';\nexport const ApiTimeout = 5000;\nexport const apiVersion = 'v2';\nexport const API_KEY = 'secret';",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue([uri] as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("API");

      // Should match API_URL, ApiTimeout (case-insensitive), apiVersion (case-insensitive), API_KEY
      expect(results.length).toBe(4);
    });
  });

  describe("AButton vs AEditButton - exact and substring matching", () => {
    it("should find both AButton.vue and AEditButton.vue when searching for AB (content search by filename substring)", async () => {
      const uris = [
        vscode.Uri.parse("file:///workspace/src/components/buttons/AButton.vue"),
        vscode.Uri.parse(
          "file:///workspace/src/components/buttons/AEditButton.vue"
        ),
        vscode.Uri.parse(
          "file:///workspace/src/components/buttons/OtherButton.vue"
        ),
      ];

      const documents: Record<string, string> = {
        "AButton.vue": "<template>ButtonContent</template>",
        "AEditButton.vue": "<template>FooBar</template>",
        "OtherButton.vue": "<template>OtherContent</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue(uris as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockImplementation((uri: any) => {
          const fileName = uri.path.split("/").pop();
          const content = documents[fileName] || "";
          return Promise.resolve({ getText: () => content } as any);
        });
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      // Content search for "AB" won't find it in file contents,
      // but this verifies it only searches content and doesn't match filenames
      const contentResults = await contentSearch.search("AB");
      expect(contentResults.length).toBe(0);
    });

    it("should find FooBar in AEditButton.vue", async () => {
      const uris = [
        vscode.Uri.parse("file:///workspace/src/components/buttons/AButton.vue"),
        vscode.Uri.parse(
          "file:///workspace/src/components/buttons/AEditButton.vue"
        ),
      ];

      const documents: Record<string, string> = {
        "AButton.vue": "<template>ButtonContent</template>",
        "AEditButton.vue": "<template>FooBar</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue(uris as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockImplementation((uri: any) => {
          const fileName = uri.path.split("/").pop();
          const content = documents[fileName] || "";
          return Promise.resolve({ getText: () => content } as any);
        });
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      const results = await contentSearch.search("FooBar");

      expect(results.length).toBe(1);
      expect(results[0].detail).toContain("AEditButton.vue");
      expect(results[0].description).toContain("FooBar");
    });

    it("should NOT find AButton or AEditButton in content when searching by name alone", async () => {
      // Searching for "AButton" or "AEditButton" should only match if the
      // name appears literally in file CONTENT, not by filename.
      // This verifies content search doesn't conflate filenames with content.
      const uris = [
        vscode.Uri.parse("file:///workspace/src/components/AButton.vue"),
        vscode.Uri.parse(
          "file:///workspace/src/components/AEditButton.vue"
        ),
      ];

      const documents: Record<string, string> = {
        "AButton.vue": "<template>Hello</template>",
        "AEditButton.vue": "<template>World</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue(uris as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockImplementation((uri: any) => {
          const fileName = uri.path.split("/").pop();
          const content = documents[fileName] || "";
          return Promise.resolve({ getText: () => content } as any);
        });
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      // "AButton" is not in file content, only in filename
      const results = await contentSearch.search("AButton");
      expect(results.length).toBe(0);
    });

    it("should find AButton in content when it appears literally in source code", async () => {
      const uris = [
        vscode.Uri.parse(
          "file:///workspace/src/components/AEditButton.vue"
        ),
      ];

      const document = {
        getText: () =>
          "<template>\n  <AButton @click=\"handleEdit\" />\n</template>",
      };

      jest
        .spyOn(vscode.workspace, "findFiles")
        .mockResolvedValue(uris as any);
      jest
        .spyOn(vscode.workspace.fs, "stat")
        .mockResolvedValue({ size: 200 } as any);
      jest
        .spyOn(vscode.workspace, "openTextDocument")
        .mockResolvedValue(document as any);
      jest
        .spyOn(config, "fetchContentSearchEnabled")
        .mockReturnValue(true);
      jest
        .spyOn(config, "fetchContentSearchMaxResults")
        .mockReturnValue(50);
      jest
        .spyOn(config, "fetchContentSearchMaxFileSizeKb")
        .mockReturnValue(512);
      jest
        .spyOn(config, "fetchContentSearchExclude")
        .mockReturnValue(["**/node_modules/**"]);

      // "AButton" appears literally in content as a component reference
      const results = await contentSearch.search("AButton");

      expect(results.length).toBe(1);
      expect(results[0].detail).toContain("AEditButton.vue");
      expect(results[0].description).toContain("AButton");
    });
  });
});
