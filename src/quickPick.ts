import * as vscode from "vscode";
import {
  fetchContentSearchEnabled,
  fetchHelpPhrase,
  fetchItemsFilterPhrases,
  fetchShouldHighlightSymbol,
  fetchShouldItemsBeSorted,
  fetchShouldUseDebounce,
  fetchShouldUseItemsFilterPhrases,
} from "./config";
import { contentSearch } from "./contentSearch";
import { ItemsFilterPhrases, QuickPickItem } from "./types";
import { utils } from "./utils";
const debounce = require("debounce");

function disposeOnDidChangeValueEventListeners(): void {
  quickPick
    .getOnDidChangeValueEventListeners()
    .forEach((eventListener: vscode.Disposable) => eventListener.dispose());
  quickPick.setOnDidChangeValueEventListeners([]);
}

function registerOnDidChangeValueEventListeners(): void {
  fetchShouldUseDebounce()
    ? registerOnDidChangeValueWithDebounceEventListeners()
    : registerOnDidChangeValueWithoutDebounceEventListeners();
}

function registerOnDidChangeValueWithDebounceEventListeners(): void {
  const control = quickPick.getControl();
  const onDidChangeValueClearingEventListener = control.onDidChangeValue(
    handleDidChangeValueClearing
  );
  const onDidChangeValueEventListener = control.onDidChangeValue(
    debounce(handleDidChangeValue, 400)
  );
  const onDidChangeValueEventListeners =
    quickPick.getOnDidChangeValueEventListeners();

  onDidChangeValueEventListeners.push(onDidChangeValueClearingEventListener);
  onDidChangeValueEventListeners.push(onDidChangeValueEventListener);
}

function registerOnDidChangeValueWithoutDebounceEventListeners(): void {
  const control = quickPick.getControl();
  const onDidChangeValueEventListener =
    control.onDidChangeValue(handleDidChangeValue);

  quickPick
    .getOnDidChangeValueEventListeners()
    .push(onDidChangeValueEventListener);
}

async function openSelected(qpItem: QuickPickItem): Promise<void> {
  shouldLoadItemsForFilterPhrase(qpItem)
    ? loadItemsForFilterPhrase(qpItem)
    : await quickPick.openItem(qpItem);
}

function shouldLoadItemsForFilterPhrase(qpItem: QuickPickItem): boolean {
  return quickPick.getShouldUseItemsFilterPhrases() && !!qpItem.isHelp;
}

function loadItemsForFilterPhrase(qpItem: QuickPickItem): void {
  const itemsFilterPhrases = quickPick.getItemsFilterPhrases();
  const filterPhrase = itemsFilterPhrases[qpItem.symbolKind];
  quickPick.setText(filterPhrase);
  quickPick.loadItems();
}

async function openItem(
  qpItem: QuickPickItem,
  viewColumn: vscode.ViewColumn = vscode.ViewColumn.Active
): Promise<void> {
  const uriOrFileName =
    qpItem.uri!.scheme === "file" ? qpItem.uri!.path : qpItem.uri;
  const document =
    uriOrFileName instanceof vscode.Uri
      ? await vscode.workspace.openTextDocument(uriOrFileName)
      : await vscode.workspace.openTextDocument(uriOrFileName);
  const editor = await vscode.window.showTextDocument(document, viewColumn);

  if (qpItem.isContentMatch && qpItem.range) {
    const pos = new vscode.Position(
      qpItem.range.start.line,
      qpItem.range.start.character
    );
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(
      new vscode.Range(pos, pos),
      vscode.TextEditorRevealType.InCenter
    );

    if (fetchShouldHighlightSymbol() && qpItem.range) {
      const start = new vscode.Position(
        qpItem.range.start.line,
        qpItem.range.start.character
      );
      const end = new vscode.Position(
        qpItem.range.end.line,
        qpItem.range.end.character
      );
      editor.selection = new vscode.Selection(start, end);
    }
  } else {
    selectQpItem(editor, qpItem);
  }
}

function selectQpItem(editor: vscode.TextEditor, qpItem: QuickPickItem): void {
  editor.selection = getSelectionForQpItem(
    qpItem,
    fetchShouldHighlightSymbol()
  );

  editor.revealRange(
    qpItem.range as vscode.Range,
    vscode.TextEditorRevealType.Default
  );
}

function getSelectionForQpItem(
  qpItem: QuickPickItem,
  shouldHighlightSymbol: boolean
): vscode.Selection {
  const { range } = qpItem;
  const start = new vscode.Position(range!.start.line, range!.start.character);
  const end = new vscode.Position(range!.end.line, range!.end.character);

  return shouldHighlightSymbol
    ? new vscode.Selection(start, end)
    : new vscode.Selection(start, start);
}

function collectHelpItems(): QuickPickItem[] {
  const items: QuickPickItem[] = [];
  const itemsFilterPhrases = quickPick.getItemsFilterPhrases();
  for (const kind in itemsFilterPhrases) {
    const filterPhrase = itemsFilterPhrases[kind];
    const item: QuickPickItem = getHelpItemForKind(kind, filterPhrase);
    items.push(item);
  }
  return items;
}

function getHelpItemForKind(
  symbolKind: string,
  itemFilterPhrase: string
): QuickPickItem {
  return {
    label: `${quickPick.getHelpPhrase()} Type ${itemFilterPhrase} for limit results to ${
      vscode.SymbolKind[parseInt(symbolKind)]
    } only`,
    symbolKind: Number(symbolKind),
    isHelp: true,
    uri: vscode.Uri.parse("#"),
  } as QuickPickItem;
}

function fetchConfig(): void {
  const shouldUseItemsFilterPhrases = fetchShouldUseItemsFilterPhrases();
  setShouldUseItemsFilterPhrases(shouldUseItemsFilterPhrases);

  const helpPhrase = fetchHelpPhrase();
  setHelpPhrase(helpPhrase);

  const itemsFilterPhrases = fetchItemsFilterPhrases();
  setItemsFilterPhrases(itemsFilterPhrases);

  const shouldItemsBeSorted = fetchShouldItemsBeSorted();
  setShouldItemsBeSorted(shouldItemsBeSorted);
}

function reloadSortingSettings() {
  const shouldItemsBeSorted = fetchShouldItemsBeSorted();
  setShouldItemsBeSorted(shouldItemsBeSorted);
  toggleKeepingSeparatorsVisibleOnFiltering();
}

function fetchHelpData(): void {
  const helpItems = collectHelpItems();
  setHelpItems(helpItems);
}

function handleDidChangeValueClearing() {
  const control = quickPick.getControl();
  control.items = [];
}

function handleDidChangeValue(text: string) {
  if (shouldLoadHelpItems(text)) {
    quickPick.loadHelpItems();
  } else if (shouldPerformContentSearch(text)) {
    quickPick.loadItemsWithContentSearch(text);
  } else {
    quickPick.loadItems();
  }
}

function getFilesButton(): vscode.QuickInputButton {
  return {
    iconPath: new vscode.ThemeIcon(
      "file",
      new vscode.ThemeColor("charts.green")
    ),
    tooltip: "Files search (always enabled)",
  };
}

function getContentButton(): vscode.QuickInputButton {
  if (contentSearchToggledOn) {
    return {
      iconPath: new vscode.ThemeIcon(
        "search",
        new vscode.ThemeColor("charts.green")
      ),
      tooltip: "Content search (enabled) - click to disable",
    };
  }
  return {
    iconPath: new vscode.ThemeIcon("search"),
    tooltip: "Content search (disabled) - click to enable",
  };
}

function updateButtons(): void {
  const control = quickPick.getControl();
  control.buttons = [getFilesButton(), getContentButton()];
}

function handleDidTriggerButton(button: vscode.QuickInputButton): void {
  const tooltip = button.tooltip as string;
  if (tooltip && tooltip.includes("Content search")) {
    contentSearchToggledOn = !contentSearchToggledOn;
    updateButtons();
    const control = quickPick.getControl();
    handleDidChangeValue(control.value);
  }
}

function shouldPerformContentSearch(text: string): boolean {
  return contentSearchToggledOn && fetchContentSearchEnabled() && text.length >= 2;
}

function shouldLoadHelpItems(text: string): boolean {
  const helpPhrase = quickPick.getHelpPhrase();
  return (
    quickPick.getShouldUseItemsFilterPhrases() &&
    !!helpPhrase &&
    text === helpPhrase
  );
}

async function handleDidAccept() {
  const control = quickPick.getControl();
  const selectedItem = control.selectedItems[0];
  selectedItem && (await openSelected(selectedItem));
}

function handleDidHide() {
  quickPick.setText("");
}

async function handleDidTriggerItemButton({
  item: qpItem,
}: vscode.QuickPickItemButtonEvent<QuickPickItem>) {
  await quickPick.openItem(qpItem, vscode.ViewColumn.Beside);
}

function init(): void {
  const control = vscode.window.createQuickPick<QuickPickItem>();
  setControl(control);
  control.matchOnDetail = true;
  control.matchOnDescription = true;

  quickPick.fetchConfig();
  fetchHelpData();
  toggleKeepingSeparatorsVisibleOnFiltering();
  updateButtons();
  registerEventListeners();
}

function toggleKeepingSeparatorsVisibleOnFiltering() {
  const shouldItemsBeSorted = quickPick.getShouldItemsBeSorted();
  const control = quickPick.getControl();

  // necessary hack to keep separators visible on filtering
  (control as any).sortByLabel = !shouldItemsBeSorted;
}

function registerEventListeners() {
  const control = quickPick.getControl();
  control.onDidHide(handleDidHide);
  control.onDidAccept(handleDidAccept);
  control.onDidTriggerItemButton(handleDidTriggerItemButton);
  control.onDidTriggerButton(handleDidTriggerButton);

  registerOnDidChangeValueEventListeners();
}

function reloadOnDidChangeValueEventListener(): void {
  disposeOnDidChangeValueEventListeners();
  registerOnDidChangeValueEventListeners();
}

function reload(): void {
  quickPick.fetchConfig();
  fetchHelpData();
}

function isInitialized(): boolean {
  return !!quickPick.getControl();
}

function show(): void {
  const control = quickPick.getControl();
  control.show();
}

function loadItems() {
  quickPick.getShouldItemsBeSorted() ? loadSortedItems() : loadUnsortedItems();
}

async function loadItemsWithContentSearch(text: string) {
  const control = quickPick.getControl();
  control.busy = true;

  try {
    const contentResults = await contentSearch.search(text);
    const existingItems = quickPick.getItems();

    if (contentResults.length > 0) {
      const separator: QuickPickItem = {
        label: "Content Matches",
        kind: vscode.QuickPickItemKind.Separator,
        symbolKind: vscode.QuickPickItemKind.Separator,
        uri: vscode.Uri.parse("#"),
      } as any;

      const mergedItems = [...existingItems, separator, ...contentResults];
      control.items = mergedItems;
    } else {
      control.items = existingItems;
    }
  } catch (e) {
    // On error, just show existing items
    control.items = quickPick.getItems();
  } finally {
    control.busy = false;
  }
}

function loadUnsortedItems(): void {
  const control = quickPick.getControl();
  control.items = quickPick.getItems();
}

function loadSortedItems(): void {
  const control = quickPick.getControl();
  const items = [...quickPick.getItems()];
  items.sort((firstItem, secondItem) => {
    if (firstItem.symbolKind > secondItem.symbolKind) {
      return 1;
    }
    if (firstItem.symbolKind < secondItem.symbolKind) {
      return -1;
    }
    return 0;
  });

  const itemsWithSeparators = addSeparatorItemForEachSymbolKind(items);
  control.items = itemsWithSeparators;
}

function loadHelpItems() {
  const control = quickPick.getControl();
  control.items = quickPick.getHelpItems();
}

function addSeparatorItemForEachSymbolKind(items: QuickPickItem[]) {
  const sortedItems = utils.groupBy(items, (item: QuickPickItem) =>
    item.symbolKind.toString()
  );
  const sortedItemsEntries = sortedItems.entries();

  for (const entry of sortedItemsEntries) {
    const symbolKind = parseInt(entry[0]);
    const items = entry[1];
    items.unshift({
      label: `${vscode.SymbolKind[symbolKind]}`,
      kind: vscode.QuickPickItemKind.Separator,
      symbolKind: vscode.QuickPickItemKind.Separator,
      uri: vscode.Uri.parse("#"),
    });
  }

  return Array.from(sortedItems.values()).flat();
}

function showLoading(value: boolean): void {
  const control = quickPick.getControl();
  control.busy = value;
}

function setText(text: string): void {
  const control = quickPick.getControl();
  control.value = text;
}

function setPlaceholder(isBusy: boolean): void {
  const control = quickPick.getControl();
  const helpPhrase = quickPick.getHelpPhrase();
  control.placeholder = isBusy
    ? "Please wait, loading..."
    : quickPick.getShouldUseItemsFilterPhrases()
    ? `${
        helpPhrase
          ? `Type ${helpPhrase} for help or start typing file or symbol name...`
          : `Help phrase not set. Start typing file or symbol name...`
      }`
    : "Start typing file or symbol name...";
}

let control: vscode.QuickPick<QuickPickItem>;
let items: QuickPickItem[] = [];
let shouldUseItemsFilterPhrases: boolean;
let helpPhrase: string;
let shouldItemsBeSorted: boolean;
let itemsFilterPhrases: ItemsFilterPhrases;
let helpItems: QuickPickItem[];
let onDidChangeValueEventListeners: vscode.Disposable[] = [];
let contentSearchToggledOn = false;

function getControl() {
  return control;
}

function setControl(newControl: vscode.QuickPick<QuickPickItem>) {
  control = newControl;
}

function getItems() {
  return items;
}

function setItems(newItems: QuickPickItem[]): void {
  reinitQpItemsButton(newItems);
  items = newItems;
}

function reinitQpItemsButton(data: QuickPickItem[]) {
  data.forEach(
    (item) =>
      (item.buttons = [
        {
          iconPath: new vscode.ThemeIcon("open-preview"),
          tooltip: "Open to the side",
        },
      ])
  );
}

function getShouldUseItemsFilterPhrases() {
  return shouldUseItemsFilterPhrases;
}

function setShouldUseItemsFilterPhrases(
  newShouldUseItemsFilterPhrases: boolean
) {
  shouldUseItemsFilterPhrases = newShouldUseItemsFilterPhrases;
}

function getHelpPhrase() {
  return helpPhrase;
}

function setHelpPhrase(newHelpPhrase: string) {
  helpPhrase = newHelpPhrase;
}

function getShouldItemsBeSorted() {
  return shouldItemsBeSorted;
}

function setShouldItemsBeSorted(newshouldItemsBeSorted: boolean) {
  shouldItemsBeSorted = newshouldItemsBeSorted;
}

function getItemsFilterPhrases() {
  return itemsFilterPhrases;
}

function setItemsFilterPhrases(newItemsFilterPhrases: ItemsFilterPhrases) {
  itemsFilterPhrases = newItemsFilterPhrases;
}

function getHelpItems() {
  return helpItems;
}

function setHelpItems(newHelpItems: QuickPickItem[]) {
  helpItems = newHelpItems;
}

function getOnDidChangeValueEventListeners() {
  return onDidChangeValueEventListeners;
}

function setOnDidChangeValueEventListeners(
  newOnDidChangeValueEventListeners: vscode.Disposable[]
) {
  onDidChangeValueEventListeners = newOnDidChangeValueEventListeners;
}

function getContentSearchToggledOn(): boolean {
  return contentSearchToggledOn;
}

function setContentSearchToggledOn(value: boolean): void {
  contentSearchToggledOn = value;
}

export const quickPick = {
  getControl,
  getItems,
  setItems,
  getShouldUseItemsFilterPhrases,
  getHelpPhrase,
  getShouldItemsBeSorted,
  toggleKeepingSeparatorsVisibleOnFiltering,
  getItemsFilterPhrases,
  getHelpItems,
  getOnDidChangeValueEventListeners,
  setOnDidChangeValueEventListeners,
  init,
  reloadOnDidChangeValueEventListener,
  reloadSortingSettings,
  reload,
  isInitialized,
  show,
  loadItems,
  loadItemsWithContentSearch,
  loadHelpItems,
  showLoading,
  setText,
  setPlaceholder,
  fetchConfig,
  openItem,
  handleDidChangeValueClearing,
  handleDidChangeValue,
  handleDidAccept,
  handleDidHide,
  handleDidTriggerItemButton,
  disposeOnDidChangeValueEventListeners,
  getContentSearchToggledOn,
  setContentSearchToggledOn,
  updateButtons,
};