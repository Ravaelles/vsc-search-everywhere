import * as vscode from "vscode";
import { controller } from "./controller";
import { settingsMenu } from "./settingsMenu";

export async function search() {
  await controller.search();
}

export async function reload() {
  await controller.reload();
}

export async function openSettings() {
  await settingsMenu.show();
}

export function deactivate() {
  console.log('Extension "search-anywhere" has been deactivated.');
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "search-anywhere" has been activated.');

  await controller.init(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("searchAnywhere.search", search),
    vscode.commands.registerCommand("searchAnywhere.reload", reload),
    vscode.commands.registerCommand(
      "searchAnywhere.openSettings",
      openSettings
    )
  );

  await controller.startup();
}
