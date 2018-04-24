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

  const activeEditorChangeListener = vscode.window.onDidChangeActiveTextEditor(e => {
    dirtyTree = true;
    tree = [];
    symbolIndex = 0;
  });
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(e => {
    dirtyTree = true;
    tree = [];
    symbolIndex = 0;
  });

  const setSymbolIndex = (cursorLine: number, cursorCharacter: number, directionNext: boolean) => {
    let member;

    if(directionNext) {
      symbolIndex = -1;
      do {
        symbolIndex++;
        member = tree[symbolIndex].location.range.start;
      } while (member.line < cursorLine || member.line === cursorLine && member.character <= cursorCharacter);

    } else {
      symbolIndex = tree.length;
      do {
        symbolIndex--;
        member = tree[symbolIndex].location.range.start;
      } while (member.line > cursorLine || member.line === cursorLine && member.character >= cursorCharacter);
    }
  };

  const previousMemberCommand = vscode.commands.registerTextEditorCommand("gotoNextPreviousMember.previousMember", async (editor: vscode.TextEditor) => {
      let symbol;

      if (tree.length === 0 || dirtyTree) {
        await refreshTree(editor);
        dirtyTree = false;
      }

      const activeCursor = editor.selection.active;
      setSymbolIndex(activeCursor.line, activeCursor.character, false);

      symbol = tree[symbolIndex];

      if (symbol) {
        editor.selection = new vscode.Selection(
          symbol.location.range.start.line,
          symbol.location.range.start.character,
          symbol.location.range.start.line,
          symbol.location.range.start.character
        );
        vscode.commands.executeCommand("revealLine", {
          lineNumber: symbol.location.range.start.line
        });
      }
      vscode.window.setStatusBarMessage("Previous Member", 1000);
    }
  );

  const nextMemberCommand = vscode.commands.registerTextEditorCommand("gotoNextPreviousMember.nextMember", async (editor: vscode.TextEditor) => {
      let symbol;

      if (tree.length === 0 || dirtyTree) {
        await refreshTree(editor);
        dirtyTree = false;
      }

      const activeCursor = editor.selection.active;
      setSymbolIndex(activeCursor.line, activeCursor.character, true);

      symbol = tree[symbolIndex];

      if (symbol) {
        editor.selection = new vscode.Selection(symbol.location.range.start.line, symbol.location.range.start.character, symbol.location.range.start.line, symbol.location.range.start.character);
        vscode.commands.executeCommand("revealLine", {
          lineNumber: symbol.location.range.start.line
        });
      }
      vscode.window.setStatusBarMessage("Next Member", 1000);
    }
  );

  context.subscriptions.push(previousMemberCommand, nextMemberCommand, documentChangeListener, activeEditorChangeListener);
}
