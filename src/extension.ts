'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let symbolIndex = 0;
  let tree: Array<vscode.DocumentSymbol> = [];
  let dirtyTree = true;

  const refreshTree = async (editor: vscode.TextEditor) => {
    tree = (await vscode.commands.executeCommand<(vscode.DocumentSymbol)[]>(
      "vscode.executeDocumentSymbolProvider",
      editor.document.uri
    ).then(results => {
      if(!results) {
        return [];
      }

      const flattenedSymbols: vscode.DocumentSymbol[] = [];
      const addSymbols = (flattenedSymbols: vscode.DocumentSymbol[], results: vscode.DocumentSymbol[]) => {
        results.forEach((symbol: vscode.DocumentSymbol) => {
          flattenedSymbols.push(symbol);
          if(symbol.children && symbol.children.length > 0) {
            addSymbols(flattenedSymbols, symbol.children);
          }
        });
      };

      addSymbols(flattenedSymbols, results);

      return flattenedSymbols.sort((x: vscode.DocumentSymbol, y: vscode.DocumentSymbol) => {
        const lineDiff = x.range.start.line - y.range.start.line;
        if(lineDiff === 0) {
          return x.range.start.character - y.range.start.character;
        }
        return lineDiff;
      });
    })) || [];
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
        member = tree[symbolIndex].range.start;
      } while (member.line < cursorLine || member.line === cursorLine && member.character <= cursorCharacter);
    } else {
      symbolIndex = tree.length;
      do {
        symbolIndex--;
        member = tree[symbolIndex].range.start;
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
          symbol.range.start.line,
          symbol.range.start.character,
          symbol.range.start.line,
          symbol.range.start.character
        );
        vscode.commands.executeCommand("revealLine", {
          lineNumber: symbol.range.start.line
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
        editor.selection = new vscode.Selection(symbol.range.start.line, symbol.range.start.character, symbol.range.start.line, symbol.range.start.character);
        vscode.commands.executeCommand("revealLine", {
          lineNumber: symbol.range.start.line
        });
      }
      vscode.window.setStatusBarMessage("Next Member", 1000);
    }
  );

  context.subscriptions.push(previousMemberCommand, nextMemberCommand, documentChangeListener, activeEditorChangeListener);
}
