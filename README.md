# Search Anywhere for Visual Studio Code

> A fast workspace search extension that lets you find **files by name** (including fuzzy matching on path segments) and **file contents** — all from a single Quick Pick dialog.

Based on [vscode-search-everywhere](https://marketplace.visualstudio.com/items?itemName=kbysiec.vscode-search-everywhere) by **kbysiec** (Krzysztof Bysiek). This fork extends the original with **content (text) search** capabilities and improved **fuzzy filename matching**.

---

## Features

### Symbol & File Search (inherited from the original)

- Search across your entire workspace for **files, classes, methods, properties, variables, interfaces, and more**
- Navigate to definitions using VS Code's built-in symbol providers
- Automatic workspace re-indexing on file changes
- Customizable exclude/include patterns
- Sortable, filterable results with Quick Pick integration

### Fuzzy File Name Matching (inherited)

When you type into the Quick Pick, VS Code's built-in fuzzy matching works on the **file path** of each item. This means you can type abbreviated parts of a filename:

| You type | You find |
|----------|----------|
| `EDB` | `AEditButton.vue` |
| `AB` | `AButton.vue`, `AEditButton.vue` |
| `myComp` | `MyComponent.tsx` |
| `src/utils` | All items under `src/utils/` |

### Content Search (new in this fork)

When no symbol or filename match is found, the extension **searches file contents** for your query. Results appear under a "Content Matches" separator in the Quick Pick.

| You type | You find |
|----------|----------|
| `FooBar` | Any file containing `FooBar` in its text |
| `class MyService` | Files with that exact text |
| `TODO` | All files containing TODO comments |

Content search:
- Is **on-demand** (not cached) — triggered when the query is ≥ 2 characters
- Respects the configured exclude patterns (e.g., `node_modules`, `dist`)
- Skips files larger than a configurable size limit
- Has a configurable maximum number of results
- Can be disabled entirely via settings

---

## Installation

1. Open **VS Code**
2. Go to **Extensions** (`Ctrl+Shift+X`)
3. Search for **Search Anywhere**
4. Click **Install**

---

## Extension Settings

This extension contributes the following settings under `searchAnywhere.*`:

### General Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `searchAnywhere.shouldInitOnStartup` | boolean | `true` | Index workspace on startup |
| `searchAnywhere.shouldDisplayNotificationInStatusBar` | boolean | `true` | Show indexing notification in status bar |
| `searchAnywhere.shouldHighlightSymbol` | boolean | `true` | Highlight symbol name on navigation |
| `searchAnywhere.shouldUseDebounce` | boolean | `true` | Use debounce on Quick Pick input |
| `searchAnywhere.shouldItemsBeSorted` | boolean | `true` | Sort items by symbol kind |
| `searchAnywhere.shouldWorkspaceDataBeCached` | boolean | `false` | Cache workspace data between sessions |
| `searchAnywhere.shouldSearchSelection` | boolean | `false` | Pre-fill Quick Pick with current selection |
| `searchAnywhere.shouldUseItemsFilterPhrases` | boolean | `true` | Enable filter phrases (e.g., `!f` for files) |
| `searchAnywhere.helpPhrase` | string | `!` | Phrase to trigger help display |
| `searchAnywhere.icons` | object | _(see below)_ | Custom codicons per symbol kind |
| `searchAnywhere.itemsFilter` | object | `{}` | Filter which symbol kinds are shown |
| `searchAnywhere.itemsFilterPhrases` | object | _(see below)_ | Filter phrases per symbol kind |

### Include / Exclude Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `searchAnywhere.include` | string[] | `["**/*"]` | Glob patterns for files to include |
| `searchAnywhere.exclude` | string[] | `["**/node_modules/**"]` | Glob patterns for files to exclude |
| `searchAnywhere.excludeMode` | string | `"searchAnywhere"` | Source of exclude patterns |

Exclude modes:
- `searchAnywhere` — uses the `searchAnywhere.exclude` setting
- `filesAndSearch` — uses VS Code's `files.exclude` and `search.exclude`
- `gitignore` — uses `.gitignore` patterns

### Content Search Settings (new)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `searchAnywhere.contentSearch.enabled` | boolean | `true` | Enable on-demand content search |
| `searchAnywhere.contentSearch.exclude` | string[] | `["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**", "**/*.min.*", "**/*.map"]` | Glob patterns to exclude from content search |
| `searchAnywhere.contentSearch.maxResults` | number | `50` | Maximum number of content search results |
| `searchAnywhere.contentSearch.maxFileSizeKb` | number | `512` | Skip files larger than this (in KB) |

---

## Commands

| Command | Keybinding | Description |
|---------|------------|-------------|
| `Search Anywhere: Search` | `Ctrl+Alt+s` / `Cmd+Alt+s` | Open the search Quick Pick |
| `Search Anywhere: Reload` | `Ctrl+Alt+r` / `Cmd+Alt+r` | Force re-index the workspace |

---

## How It Works

1. **Indexing**: On startup (or on first search), the extension scans all workspace files and extracts symbols using VS Code's document symbol provider
2. **Filename matching**: When you type in the Quick Pick, VS Code's built-in fuzzy matching filters the indexed items by filename/path
3. **Content search**: If enabled, the extension also searches file contents on-demand for your query text, showing matches under a "Content Matches" separator
4. **Live updates**: The index is automatically updated when files are created, renamed, deleted, or modified

---

## Credits

- **Original author**: [Krzysztof Bysiek (kbysiec)](https://github.com/kbysiec) — [vscode-search-everywhere](https://marketplace.visualstudio.com/items?itemName=kbysiec.vscode-search-everywhere)
- **Fork by**: [Rafał Poniatowski (Ravaelles)](mailto:ravaelles@gmail.com)

---

## License

* `searchEverywhere.icons`

Ability to define icons that should be displayed for appropriate item types. According to VSC API, only Octicons are allowed. Not defined item type will not have any icon.

Default value:
```json
{
  "0": "symbol-file",
  "1": "file-submodule",
  "2": "symbol-namespace",
  "3": "package",
  "4": "symbol-class",
  "5": "symbol-method",
  "6": "symbol-property",
  "7": "symbol-field",
  "8": "symbol-ruler",
  "9": "symbol-enum",
  "10": "symbol-interface",
  "11": "variable-group",
  "12": "symbol-variable",
  "13": "symbol-constant",
  "14": "symbol-string",
  "15": "symbol-numeric",
  "16": "symbol-boolean",
  "17": "symbol-array",
  "18": "symbol-keyword",
  "19": "symbol-key",
  "20": "remove",
  "21": "symbol-enum-member",
  "22": "symbol-structure",
  "23": "symbol-event",
  "24": "symbol-operator",
  "25": "type-hierarchy-sub"
}
```

Below you can find the table with information which symbol kind refers to which symbol name:

| kind | icon               | symbol name    |
|------|:------------------:|:--------------:|
|   0  | symbol-file        | file           |
|   1  | file-submodule     | module         |
|   2  | symbol-namespace   | namespace      |
|   3  | package            | package        |
|   4  | symbol-class       | class          |
|   5  | symbol-method      | method         |
|   6  | symbol-property    | property       |
|   7  | symbol-field       | field          |
|   8  | symbol-ruler       | constructor    |
|   9  | symbol-enum        | enum           |
|  10  | symbol-interface   | interface      |
|  11  | variable-group     | function       |
|  12  | symbol-variable    | variable       |
|  13  | symbol-constant    | constant       |
|  14  | symbol-string      | string         |
|  15  | symbol-numeric     | number         |
|  16  | symbol-boolean     | boolean        |
|  17  | symbol-array       | array          |
|  18  | symbol-keyword     | object         |
|  19  | symbol-key         | key            |
|  20  | remove             | null           |
|  21  | symbol-enum-member | enum member    |
|  22  | symbol-structure   | struct         |
|  23  | symbol-event       | event          |
|  24  | symbol-operator    | operator       |
|  25  | type-hierarchy-sub | type parameter |

* `searchEverywhere.itemsFilter`

Ability to define a filter that should be applied to items.
All kinds can be find here: https://code.visualstudio.com/api/references/vscode-api#SymbolKind

Default value:

```json
{
  "allowedKinds": [],
  "ignoredKinds": [],
  "ignoredNames": []
}
```

Below is an example which will remove from items all arrays (17), booleans (16) and the ones containing "foo" string in the name:

```json
{
  "allowedKinds": [],
  "ignoredKinds": [16, 17],
  "ignoredNames": ["foo"]
}
```

* `searchEverywhere.shouldUseItemsFilterPhrases`

Should be a possibility to filter by assigned filter phrases.
Default value: `true`.


* `searchEverywhere.itemsFilterPhrases`

Phrases for item type which could be used for narrowing the results down.

Default value:

```json
{
  "0": "$$",
  "4": "@@",
  "11": "!!",
  "14": "##",
  "17": "%%"
}
```

* `searchEverywhere.helpPhrase`

A phrase which should invoke help.
Default value: `?`

* `searchEverywhere.shouldItemsBeSorted`

Ability to decide whether items should be sorted by type.
Default value: `true`

* `searchEverywhere.exclude`

An array of globs. Any file matching these globs will be excluded from indexing.

Default value:

```json
[
  "**/.git",
  "**/.svn",
  "**/.hg",
  "**/.CVS",
  "**/.DS_Store",
  "**/package-lock.json",
  "**/yarn.lock",
  "**/node_modules/**",
  "**/bower_components/**",
  "**/coverage/**",
  "**/.vscode/**",
  "**/.vscode-test/**",
  "**/.history/**",
  "**/.cache/**",
  "**/.cache-loader/**",
  "**/out/**",
  "**/dist/**"
]
```

* `searchEverywhere.include`

String with include pattern. Any file matching this glob will be included in indexing.

Default value:

```json
"**/*.{js,jsx,ts,tsx}"
```

* `searchEverywhere.excludeMode`

Ability to choose which exclude option should be applied. If gitignore file is not found or is empty, the extension option is used as a fallback. Available options: `search everywhere`, `files and search`, `gitignore`. To see the changes from the updated gitignore file after indexing, the reload must be done.
Default value: `search everywhere`.

* `searchEverywhere.shouldWorkspaceDataBeCached`

Ability to decide if the workspace should be indexed only once. Each next startup of Visual Studio Code will collect data from cache.
Default value: `true`

* `searchEverywhere.shouldSearchSelection`

Ability to decide whether selection in the active editor is put in the search.
Default value: `true`

## Release Notes

Please check changelog for release details.

## How to run it locally

If you would like to run the extension locally, go through the following steps:

  1. clone the repository
  2. run `npm install` to install all dependencies
  3. open `run and debug` view
  4. run `run extension`
  5. enjoy development!

## Author

[Kamil Bysiec](https://github.com/kbysiec)

## Acknowledgment

If you found it useful somehow, I would be grateful if you could leave a "Rating & Review" in Marketplace or/and leave a star in the project's GitHub repository.

Thank you.
