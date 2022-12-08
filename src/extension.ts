'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  let configuredSymbolKindsSet: Set<string>;
  let workingSymbolKindsSet: Set<string>;
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
    configuredSymbolKindsSet = new Set<string>(symbolKindsArray);

    // Reload the symbol tree
    dirtyTree = true;
  };

  const checkSymbolKindPermitted = (symbolKind : vscode.SymbolKind) : boolean => {
    // https://code.visualstudio.com/api/references/vscode-api#SymbolKind
    return workingSymbolKindsSet.size === 0 || (
      (symbolKind === vscode.SymbolKind.Array         && workingSymbolKindsSet.has("array")        ) ||
      (symbolKind === vscode.SymbolKind.Boolean       && workingSymbolKindsSet.has("boolean")      ) ||
      (symbolKind === vscode.SymbolKind.Class         && workingSymbolKindsSet.has("class")        ) ||
      (symbolKind === vscode.SymbolKind.Constant      && workingSymbolKindsSet.has("constant")     ) ||
      (symbolKind === vscode.SymbolKind.Constructor   && workingSymbolKindsSet.has("constructor")  ) ||
      (symbolKind === vscode.SymbolKind.Enum          && workingSymbolKindsSet.has("enum")         ) ||
      (symbolKind === vscode.SymbolKind.EnumMember    && workingSymbolKindsSet.has("enummember")   ) ||
      (symbolKind === vscode.SymbolKind.Event         && workingSymbolKindsSet.has("event")        ) ||
      (symbolKind === vscode.SymbolKind.Field         && workingSymbolKindsSet.has("field")        ) ||
      (symbolKind === vscode.SymbolKind.File          && workingSymbolKindsSet.has("file")         ) ||
      (symbolKind === vscode.SymbolKind.Function      && workingSymbolKindsSet.has("function")     ) ||
      (symbolKind === vscode.SymbolKind.Interface     && workingSymbolKindsSet.has("interface")    ) ||
      (symbolKind === vscode.SymbolKind.Key           && workingSymbolKindsSet.has("key")          ) ||
      (symbolKind === vscode.SymbolKind.Method        && workingSymbolKindsSet.has("method")       ) ||
      (symbolKind === vscode.SymbolKind.Module        && workingSymbolKindsSet.has("module")       ) ||
      (symbolKind === vscode.SymbolKind.Namespace     && workingSymbolKindsSet.has("namespace")    ) ||
      (symbolKind === vscode.SymbolKind.Null          && workingSymbolKindsSet.has("null")         ) ||
      (symbolKind === vscode.SymbolKind.Number        && workingSymbolKindsSet.has("number")       ) ||
      (symbolKind === vscode.SymbolKind.Object        && workingSymbolKindsSet.has("object")       ) ||
      (symbolKind === vscode.SymbolKind.Operator      && workingSymbolKindsSet.has("operator")     ) ||
      (symbolKind === vscode.SymbolKind.Package       && workingSymbolKindsSet.has("package")      ) ||
      (symbolKind === vscode.SymbolKind.Property      && workingSymbolKindsSet.has("property")     ) ||
      (symbolKind === vscode.SymbolKind.String        && workingSymbolKindsSet.has("string")       ) ||
      (symbolKind === vscode.SymbolKind.Struct        && workingSymbolKindsSet.has("struct")       ) ||
      (symbolKind === vscode.SymbolKind.TypeParameter && workingSymbolKindsSet.has("typeparameter")) ||
      (symbolKind === vscode.SymbolKind.Variable      && workingSymbolKindsSet.has("variable")     )
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
          flattenedSymbols.push(symbol);
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

  const setSymbolIndex = (cursorLine: number, cursorCharacter: number, directionNext: boolean) => {
    if(directionNext) {
      for (const symbol of tree) {
        const { start: member } = symbol.selectionRange;
        if (!(member.line < cursorLine || member.line === cursorLine && member.character <= cursorCharacter) && checkSymbolKindPermitted(symbol.kind)) {
          symbolIndex = tree.indexOf(symbol)
          break;
        }
      }
    } else {
      for (const symbol of tree.slice(0).reverse()) {
        const { start: member } = symbol.selectionRange;
        
        if ((member.line < cursorLine || (member.line === cursorLine && member.character < cursorCharacter)) && checkSymbolKindPermitted(symbol.kind)) {
          symbolIndex = tree.indexOf(symbol)
          break;
        }
      }
    }
  };

  const previousMemberCommand = vscode.commands.registerTextEditorCommand("gotoNextPreviousMember.previousMember", async (editor: vscode.TextEditor, edit, symbolKinds?: string[]) => {
      let symbol;
      
      // if we're provided symbols from a keybinding use them.
      if (symbolKinds && symbolKinds.length > 0) {
        workingSymbolKindsSet = new Set<string>(symbolKinds.map((s) => {
          return s.toLowerCase();
        }))
      } else {
        workingSymbolKindsSet = configuredSymbolKindsSet;
      }

      if (tree.length === 0 || dirtyTree) {
        await refreshTree(editor);
        dirtyTree = false;
      }

      // If there are still no symbols skip the rest of the function
      if (tree.length === 0) {
        return;
      }

      const activeCursor = editor.selection.active;
      setSymbolIndex(activeCursor.line, activeCursor.character, false);

      symbol = tree[symbolIndex];

      if (symbol) {
        editor.selection = new vscode.Selection(
          symbol.selectionRange.end.line,
          symbol.selectionRange.end.character,
          symbol.selectionRange.start.line,
          symbol.selectionRange.start.character,
        );
        vscode.commands.executeCommand("revealLine", {
          lineNumber: symbol.selectionRange.start.line,
          at: "center"
        });
      }
      vscode.window.setStatusBarMessage("Previous Member", 1000);
    }
  );

  const nextMemberCommand = vscode.commands.registerTextEditorCommand("gotoNextPreviousMember.nextMember", async (editor: vscode.TextEditor, edit, symbolKinds?: string[]) => {
      let symbol;

      // if we're provided symbols from a keybinding use them.
      if (symbolKinds && symbolKinds.length > 0) {
        workingSymbolKindsSet = new Set<string>(symbolKinds.map((s) => {
          return s.toLowerCase();
        }))
      } else {
        workingSymbolKindsSet = configuredSymbolKindsSet;
      }

      if (tree.length === 0 || dirtyTree) {
        await refreshTree(editor);
        dirtyTree = false;
      }

      // If there are still no symbols skip the rest of the function
      if (tree.length === 0) {
        return;
      }

      const activeCursor = editor.selection.active;
      setSymbolIndex(activeCursor.line, activeCursor.character, true);

      symbol = tree[symbolIndex];

      if (symbol) {
        editor.selection = new vscode.Selection(
          symbol.selectionRange.end.line,
          symbol.selectionRange.end.character,
          symbol.selectionRange.start.line,
          symbol.selectionRange.start.character,
        );
        vscode.commands.executeCommand("revealLine", {
          lineNumber: symbol.selectionRange.start.line,
          at: "center"
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
