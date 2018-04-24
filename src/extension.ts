'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let symbolIndex = 0;
  let tree: Array<vscode.SymbolInformation> = [];
  let dirtyTree = true;

  const refreshTree = async (editor: vscode.TextEditor) => {
    tree = (await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
      "vscode.executeDocumentSymbolProvider",
      editor.document.uri
    )) || [];
  };

  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(e => {
    dirtyTree = true;
  });

  const setSymbolIndex = (currentLine: number, directionNext: boolean) => {
    if(directionNext) {
      symbolIndex = -1;
      do {
        symbolIndex++;
      } while (tree[symbolIndex] && currentLine > tree[symbolIndex].location.range.start.line);
    } else {
      symbolIndex = tree.length;
      do {
        symbolIndex--;
      } while (tree[symbolIndex] && currentLine <= tree[symbolIndex].location.range.start.line);
    }
  };

  const previousMemberCommand = vscode.commands.registerTextEditorCommand("gotoNextPreviousMember.previousMember", async (editor: vscode.TextEditor) => {
      let symbol;

      if (!tree || dirtyTree) {
        refreshTree(editor);
        setSymbolIndex(editor.selection.active.line, false);
        dirtyTree = false;
      } else {
        if (symbolIndex >= 0) {
          symbolIndex--;
        } else {
          symbolIndex = 0;
        }
      }

      symbol = tree[symbolIndex];

      if (symbol) {
        editor.selection = new vscode.Selection(
          symbol.location.range.start.line,
          symbol.location.range.start.character,
          symbol.location.range.start.line,
          symbol.location.range.start.character
        );
        vscode.commands.executeCommand("revealLine", {
          lineNumber: symbol.location.range.start.line,
          at: "center"
        });
      }

      console.log("Previous Member");
    }
  );

  const nextMemberCommand = vscode.commands.registerTextEditorCommand("gotoNextPreviousMember.nextMember", async (editor: vscode.TextEditor) => {
      let symbol;

      if (!tree || dirtyTree) {
        refreshTree(editor);
        setSymbolIndex(editor.selection.active.line, true);
      } else {
        if (symbolIndex < tree.length) {
          symbolIndex++;
        } else {
          symbolIndex = tree.length - 1;
        }
      }

      symbol = tree[symbolIndex];

      if (symbol) {
        editor.selection = new vscode.Selection(symbol.location.range.start.line, symbol.location.range.start.character, symbol.location.range.start.line, symbol.location.range.start.character);
        vscode.commands.executeCommand("revealLine", {
          lineNumber: symbol.location.range.start.line,
          at: "center"
        });
      }

      console.log("Next Member");
    }
  );

  context.subscriptions.push(previousMemberCommand, nextMemberCommand, documentChangeListener);
}
