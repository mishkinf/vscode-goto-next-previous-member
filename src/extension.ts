'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let symbolKindsSet: Set<string>;
  let symbolIndex = 0;
  let tree: Array<vscode.DocumentSymbol> = [];
  let dirtyTree = true;

  const reloadConfiguration = () => {
    // Get the array of allowed symbols from the config file
    let symbolKindsArray: Array<string> | undefined = vscode.workspace.getConfiguration().get<Array<string>>("gotoNextPreviousMember.symbolKinds");

    // If it's empty there's nothing to do...
    if (symbolKindsArray === undefined) {
      return;
    }

    // Convert to lowercase make config file case-insensitive
    symbolKindsArray = symbolKindsArray.map(key => key.toLowerCase());

    // Convert to a Set for faster lookups
    symbolKindsSet = new Set<string>(symbolKindsArray);

    // Reload the symbol tree
    dirtyTree = true;
  };

  const checkSymbolKindPermitted = (symbolKind : vscode.SymbolKind) : boolean => {
    // https://code.visualstudio.com/api/references/vscode-api#SymbolKind
    return symbolKindsSet.size === 0 || (
      (symbolKind === vscode.SymbolKind.Array         && symbolKindsSet.has("array")        ) ||
      (symbolKind === vscode.SymbolKind.Boolean       && symbolKindsSet.has("boolean")      ) ||
      (symbolKind === vscode.SymbolKind.Class         && symbolKindsSet.has("class")        ) ||
      (symbolKind === vscode.SymbolKind.Constant      && symbolKindsSet.has("constant")     ) ||
      (symbolKind === vscode.SymbolKind.Constructor   && symbolKindsSet.has("constructor")  ) ||
      (symbolKind === vscode.SymbolKind.Enum          && symbolKindsSet.has("enum")         ) ||
      (symbolKind === vscode.SymbolKind.EnumMember    && symbolKindsSet.has("enummember")   ) ||
      (symbolKind === vscode.SymbolKind.Event         && symbolKindsSet.has("event")        ) ||
      (symbolKind === vscode.SymbolKind.Field         && symbolKindsSet.has("field")        ) ||
      (symbolKind === vscode.SymbolKind.File          && symbolKindsSet.has("file")         ) ||
      (symbolKind === vscode.SymbolKind.Function      && symbolKindsSet.has("function")     ) ||
      (symbolKind === vscode.SymbolKind.Interface     && symbolKindsSet.has("interface")    ) ||
      (symbolKind === vscode.SymbolKind.Key           && symbolKindsSet.has("key")          ) ||
      (symbolKind === vscode.SymbolKind.Method        && symbolKindsSet.has("method")       ) ||
      (symbolKind === vscode.SymbolKind.Module        && symbolKindsSet.has("module")       ) ||
      (symbolKind === vscode.SymbolKind.Namespace     && symbolKindsSet.has("namespace")    ) ||
      (symbolKind === vscode.SymbolKind.Null          && symbolKindsSet.has("null")         ) ||
      (symbolKind === vscode.SymbolKind.Number        && symbolKindsSet.has("number")       ) ||
      (symbolKind === vscode.SymbolKind.Object        && symbolKindsSet.has("object")       ) ||
      (symbolKind === vscode.SymbolKind.Operator      && symbolKindsSet.has("operator")     ) ||
      (symbolKind === vscode.SymbolKind.Package       && symbolKindsSet.has("package")      ) ||
      (symbolKind === vscode.SymbolKind.Property      && symbolKindsSet.has("property")     ) ||
      (symbolKind === vscode.SymbolKind.String        && symbolKindsSet.has("string")       ) ||
      (symbolKind === vscode.SymbolKind.Struct        && symbolKindsSet.has("struct")       ) ||
      (symbolKind === vscode.SymbolKind.TypeParameter && symbolKindsSet.has("typeparameter")) ||
      (symbolKind === vscode.SymbolKind.Variable      && symbolKindsSet.has("variable")     )
    );
  };

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
          if(checkSymbolKindPermitted(symbol.kind)) {
            flattenedSymbols.push(symbol);
          }
          if(symbol.children && symbol.children.length > 0) {
            addSymbols(flattenedSymbols, symbol.children);
          }
        });
      };

      addSymbols(flattenedSymbols, results);

      return flattenedSymbols.sort((x: vscode.DocumentSymbol, y: vscode.DocumentSymbol) => {
        const lineDiff = x.selectionRange.start.line - y.selectionRange.start.line;
        if(lineDiff === 0) {
          return x.selectionRange.start.character - y.selectionRange.start.character;
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

  const setSymbolIndex = (cursorLine: number, cursorCharacter: number, directionNext: boolean, prevSymbolIndex: number) => {
    let member;

    if(directionNext) {
      symbolIndex = -1;
      do {
        symbolIndex++;
        member = tree[symbolIndex].selectionRange.start;
      } while ((member.line < cursorLine || member.line === cursorLine && member.character <= cursorCharacter || symbolIndex === prevSymbolIndex) && symbolIndex < tree.length - 1);
    } else {
      symbolIndex = tree.length;
      do {
        symbolIndex--;
        member = tree[symbolIndex].selectionRange.start;
      } while ((member.line > cursorLine || member.line === cursorLine && member.character >= cursorCharacter || symbolIndex === prevSymbolIndex) && symbolIndex > 0);
    }
  };

  const previousMemberCommand = vscode.commands.registerTextEditorCommand("gotoNextPreviousMember.previousMember", async (editor: vscode.TextEditor) => {
      let symbol;

      if (tree.length === 0 || dirtyTree) {
        await refreshTree(editor);
        dirtyTree = false;
      }

      // If there are still no symbols skip the rest of the function
      if (tree.length === 0) {
        return;
      }

      const activeCursor = editor.selection.active;
      setSymbolIndex(activeCursor.line, activeCursor.character, false, symbolIndex);

      symbol = tree[symbolIndex];

      const selectionRangeText = editor.document.getText(symbol.selectionRange);
      const nameIndex = Math.max(0, selectionRangeText.indexOf(symbol.name));

      if (symbol) {
        editor.selection = new vscode.Selection(
          symbol.selectionRange.start.line,
          symbol.selectionRange.start.character + nameIndex,
          symbol.selectionRange.start.line,
          symbol.selectionRange.start.character + nameIndex
        );
        vscode.commands.executeCommand("revealLine", {
          lineNumber: symbol.selectionRange.start.line
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

      // If there are still no symbols skip the rest of the function
      if (tree.length === 0) {
        return;
      }

      const activeCursor = editor.selection.active;
      setSymbolIndex(activeCursor.line, activeCursor.character, true, symbolIndex);

      symbol = tree[symbolIndex];

      const selectionRangeText = editor.document.getText(symbol.selectionRange);
      const nameIndex = Math.max(0, selectionRangeText.indexOf(symbol.name));

      if (symbol) {
        editor.selection = new vscode.Selection(
          symbol.selectionRange.start.line,
          symbol.selectionRange.start.character + nameIndex,
          symbol.selectionRange.start.line,
          symbol.selectionRange.start.character + nameIndex
        );
        vscode.commands.executeCommand("revealLine", {
          lineNumber: symbol.selectionRange.start.line
        });
      }
      vscode.window.setStatusBarMessage("Next Member", 1000);
    }
  );

  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('gotoNextPreviousMember.symbolKinds')) {
      if (vscode.window.activeTextEditor) {
        reloadConfiguration();
      }
    }
  }));

  context.subscriptions.push(previousMemberCommand, nextMemberCommand, documentChangeListener, activeEditorChangeListener);

  reloadConfiguration();
}
