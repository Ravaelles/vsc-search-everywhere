// Mock for the 'vscode' module used by Jest tests
// Provides minimal implementations of VS Code API classes

/* eslint-disable @typescript-eslint/no-unused-vars */

export class Position {
  line: number;
  character: number;
  constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

export class Range {
  start: Position;
  end: Position;
  constructor(
    startLine: number,
    startChar: number,
    endLine: number,
    endChar: number
  ) {
    this.start = new Position(startLine, startChar);
    this.end = new Position(endLine, endChar);
  }
  contains(positionOrRange: Position | Range): boolean {
    return false;
  }
}

export class Selection extends Range {
  anchor: Position;
  active: Position;
  constructor(
    anchorLine: number,
    anchorChar: number,
    activeLine: number,
    activeChar: number
  ) {
    super(anchorLine, anchorChar, activeLine, activeChar);
    this.anchor = new Position(anchorLine, anchorChar);
    this.active = new Position(activeLine, activeChar);
  }
}

export class Uri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;

  private constructor(scheme: string, path: string) {
    this.scheme = scheme;
    this.authority = "";
    this.path = path;
    this.query = "";
    this.fragment = "";
    this.fsPath = path;
  }

  static file(path: string): Uri {
    return new Uri("file", path);
  }

  static parse(value: string): Uri {
    const match = value.match(
      /^(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/
    );
    const scheme = (match && match[1]) || "file";
    const path = (match && match[3]) || value;
    return new Uri(scheme, path);
  }

  toString(): string {
    return `${this.scheme}://${this.path}`;
  }
}

export class Disposable {
  private _callOnDispose: () => void;
  constructor(callOnDispose: () => void) {
    this._callOnDispose = callOnDispose;
  }
  dispose() {
    this._callOnDispose();
  }
}

export enum EndOfLine {
  LF = 1,
  CRLF = 2,
}

export enum SymbolKind {
  File = 0,
  Module = 1,
  Namespace = 2,
  Package = 3,
  Class = 4,
  Method = 5,
  Property = 6,
  Field = 7,
  Constructor = 8,
  Enum = 9,
  Interface = 10,
  Function = 11,
  Variable = 12,
  Constant = 13,
  String = 14,
  Number = 15,
  Boolean = 16,
  Array = 17,
  Object = 18,
  Key = 19,
  Null = 20,
  EnumMember = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export enum QuickPickItemKind {
  Separator = -1,
  Default = 0,
}

export class ThemeIcon {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum FileType {
  Unknown = 0,
  File = 1,
  Directory = 2,
  SymbolicLink = 64,
}

export enum TextEditorRevealType {
  Default = 0,
  InCenter = 1,
  InCenterIfOutsideViewport = 2,
  AtTop = 3,
}

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
}

// Mock workspace configuration
const mockConfiguration: Record<string, any> = {};

export const workspace = {
  workspaceFolders: undefined as WorkspaceFolder[] | undefined,

  getConfiguration: (section?: string) => {
    return {
      get: <T>(key: string, defaultValue?: T): T | undefined => {
        const fullKey = section ? `${section}.${key}` : key;
        return mockConfiguration[fullKey] !== undefined
          ? mockConfiguration[fullKey]
          : defaultValue;
      },
      update: (
        key: string,
        value: any,
        _configurationTarget?: ConfigurationTarget
      ) => {
        const fullKey = section ? `${section}.${key}` : key;
        mockConfiguration[fullKey] = value;
        return Promise.resolve();
      },
      has: (key: string) => {
        const fullKey = section ? `${section}.${key}` : key;
        return mockConfiguration[fullKey] !== undefined;
      },
      inspect: () => undefined,
    };
  },

  findFiles: () => Promise.resolve([]),
  openTextDocument: () => Promise.resolve({ getText: () => "" }),
  onDidChangeConfiguration: () => new Disposable(() => {}),
  onDidChangeWorkspaceFolders: () => new Disposable(() => {}),
  onDidChangeTextDocument: () => new Disposable(() => {}),
  onDidSaveTextDocument: () => new Disposable(() => {}),
  onDidCreateFiles: () => new Disposable(() => {}),
  onDidDeleteFiles: () => new Disposable(() => {}),
  onDidRenameFiles: () => new Disposable(() => {}),

  fs: {
    stat: () => Promise.resolve({ size: 0 }),
    readFile: () => Promise.resolve(new Uint8Array()),
    writeFile: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    rename: () => Promise.resolve(),
  },
};

export const window = {
  createQuickPick: () => ({
    items: [] as any[],
    value: "",
    placeholder: "",
    busy: false,
    show: () => {},
    hide: () => {},
    dispose: () => {},
    onDidAccept: () => new Disposable(() => {}),
    onDidHide: () => new Disposable(() => {}),
    onDidChangeValue: () => new Disposable(() => {}),
    onDidTriggerItemButton: () => new Disposable(() => {}),
    sortByLabel: true,
  }),

  showTextDocument: () => Promise.resolve(),
  showInformationMessage: () => Promise.resolve(),
  showWarningMessage: () => Promise.resolve(),
  showErrorMessage: () => Promise.resolve(),
  createOutputChannel: () => ({
    appendLine: () => {},
    show: () => {},
    dispose: () => {},
  }),
  withProgress: () => Promise.resolve(),

  activeTextEditor: undefined as any,

  onDidChangeActiveTextEditor: () => new Disposable(() => {}),
};

export const commands = {
  registerCommand: () => new Disposable(() => {}),
  executeCommand: () => Promise.resolve(),
};

export interface WorkspaceFolder {
  uri: Uri;
  name: string;
  index: number;
}

export interface TextLine {
  lineNumber: number;
  text: string;
  range: Range;
  rangeIncludingLineBreak: Range;
  firstNonWhitespaceCharacterIndex: number;
  isEmptyOrWhitespace: boolean;
}

export interface TextDocument {
  uri: Uri;
  fileName: string;
  isUntitled: boolean;
  languageId: string;
  version: number;
  isDirty: boolean;
  isClosed: boolean;
  save: () => Thenable<boolean>;
  eol: EndOfLine;
  lineCount: number;
  lineAt: (line: number | Position) => TextLine;
  getText: (range?: Range) => string;
  getWordRangeAtPosition: (
    position: Position,
    regex?: RegExp
  ) => Range | undefined;
  validateRange: (range: Range) => Range;
  validatePosition: (position: Position) => Position;
  offsetAt: (position: Position) => number;
  positionAt: (offset: number) => Position;
}

export interface QuickPickItem {
  label: string;
  kind?: QuickPickItemKind;
  description?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
  buttons?: QuickInputButton[];
}

export interface QuickInputButton {
  iconPath: Uri | ThemeIcon;
  tooltip: string | undefined;
}

export interface QuickPickItemButtonEvent<T extends QuickPickItem> {
  button: QuickInputButton;
  item: T;
}

export interface TextEditor {
  document: TextDocument;
  selection: Selection;
  viewColumn: ViewColumn | undefined;
  revealRange: (range: Range, revealType?: TextEditorRevealType) => void;
}

export interface TextDocumentChangeEvent {
  document: TextDocument;
  contentChanges: ReadonlyArray<any>;
}

export interface FileCreateEvent {
  files: ReadonlyArray<Uri>;
}

export interface FileDeleteEvent {
  files: ReadonlyArray<Uri>;
}

export interface FileRenameEvent {
  files: ReadonlyArray<{ oldUri: Uri; newUri: Uri }>;
}

export interface WorkspaceFoldersChangeEvent {
  added: ReadonlyArray<WorkspaceFolder>;
  removed: ReadonlyArray<WorkspaceFolder>;
}

export interface ConfigurationChangeEvent {
  affectsConfiguration: (section: string, scope?: any) => boolean;
}

export interface Progress<T> {
  report(value: T): void;
}

export interface CancellationToken {
  isCancellationRequested: boolean;
  onCancellationRequested: (listener: (e: any) => any) => Disposable;
}

export interface DocumentSymbol {
  name: string;
  detail: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  children: DocumentSymbol[];
}

// Helper to reset mock configuration (useful in beforeEach)
export const __resetMocks = () => {
  Object.keys(mockConfiguration).forEach((key) => {
    delete mockConfiguration[key];
  });
};