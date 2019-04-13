# vscode-goto-next-previous-member

Visual Studio Code Extension to navigate through the functions, variables, and classes using quick and easy keycommands similar to functionality provided by IntelliJ IDE's (next/previous function) or Resharper (next/previous member)

## Features

This Extension provides two key commands to navigate up and down through the members in your file.

![Next Previous Member Demo](demo.gif)

## Requirements

vscode@1.28.0+

## Extension Settings

This extension contributes the following customizable Keyboard Shortcuts:

| Command                                      | Description               | Key Command |
| -------------------------------------------- |:------------------------- | :-----------|
| `gotoNextPreviousMember.previousMember`      | Move To Previous Member   | ctrl+up     |
| `gotoNextPreviousMember.nextMember`          | Move To Next Member       | ctrl+down   |

and the `gotoNextPreviousMember.symbolKinds` configuration setting which accepts an array containing any of the following values:

| Symbol Kind     |
| --------------- |
| "array"         |
| "boolean"       |
| "class"         |
| "constant"      |
| "constructor"   |
| "enum"          |
| "enummember"    |
| "event"         |
| "field"         |
| "file"          |
| "function"      |
| "interface"     |
| "key"           |
| "method"        |
| "module"        |
| "namespace"     |
| "null"          |
| "number"        |
| "object"        |
| "operator"      |
| "package"       |
| "property"      |
| "string"        |
| "struct"        |
| "typeparameter" |
| "variable"      |

All of the symbol kinds specified in the array will be used when moving to the next/previous symbol, omitted symbol kinds will be skipped. If an empty array is provided, all symbol kinds will be used (this is the default).

## Language Support

For the outline to work, the language support plugins need to support symbol information.

For the outline to form a tree structure, the language support plugins need to report the entire definition range as part of symbol.

See VS Code [issue #34968](https://github.com/Microsoft/vscode/issues/34968) and language server protocol [issue #132](https://github.com/Microsoft/language-server-protocol/issues/132) for a discussion.

Here is a list of languages known to work with Code Outline:

| Language/Format | Extension |
| --- | --- |
| C | [C/C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) |
| C++ | [C/C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools), [cquery](https://github.com/cquery-project/vscode-cquery) |
| Docker | [Docker](https://marketplace.visualstudio.com/items?itemName=PeterJausovec.vscode-docker) |
| HTML | Comes with VS Code |
| JavaScript | Comes with VS Code |
| JSON | Comes with VS Code |
| Markdown | Comes with VS Code |
| Perl | [Perl](https://marketplace.visualstudio.com/items?itemName=henriiik.vscode-perl) |
| PHP | [PHP Symbols](https://marketplace.visualstudio.com/items?itemName=linyang95.php-symbols) |
| Python | [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python) |
| TypeScript | Comes with VS Code |
| YAML | [YAML Support by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) |

Please report any missing extensions and I'll update the list.

## Known Issues

If you are experiencing no movement upon running the command:

I have observed an issue with the Visual Studio API to return symbols from `vscode.executeDocumentSymbolProvider`. One way I have found to possibly fix the issue is to disable all extensions, restart Visual Studio and then enable all extensions and restart again.

Possible Related Issue:
[https://github.com/OmniSharp/omnisharp-vscode/issues/2192](https://github.com/OmniSharp/omnisharp-vscode/issues/2192)

## Release Notes

See [CHANGELOG.md](CHANGELOG.md)

---------------------------------------------------------------------------------------

### More Visual Studio Code Extensions by `mishkinf`

#### [Visual Studio Code Navigate Edits History - Goto Last Edit](https://github.com/mishkinf/vscode-edits-history)

  A Visual Studio Extension that provides the ability to quickly navigate back and forth between recently made edits

**Enjoy!**

## License

MIT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
