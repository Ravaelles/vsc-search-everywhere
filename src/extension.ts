import * as vscode from "vscode";
import { controller } from "./controller";

export async function search() {
  await controller.search();
}

export async function reload() {
  await controller.reload();
}

export function deactivate() {
  console.log('Extension "search-anywhere" has been deactivated.');
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('Extension "search-anywhere" has been activated.');

  await controller.init(context);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "searchAnywhere.search",
      search.bind(null, controller)
    ),
    vscode.commands.registerCommand(
      "searchAnywhere.reload",
      reload.bind(null, controller)
    )
  );

  await controller.startup();
}