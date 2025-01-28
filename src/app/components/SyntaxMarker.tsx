"use client";
import * as monaco from "monaco-editor";


export class SyntaxMarker {
  private _markers: monaco.IDisposable[] = [];

  constructor(private lineNumber: number, private message: string) { }

  public markLine(editor: monaco.editor.IStandaloneCodeEditor) {
    this._markers.push(
      monaco.editor.createDecorations(
        editor,
        [
          {
            range: new monaco.Range(this.lineNumber, 1, this.lineNumber, 1),
            options: {
              isWholeLine: true,
              className: "myContentClass",
              hoverMessage: { value: this.message },
            },
          },
        ]
      )
    );
  }

  public dispose() {
    for (const marker of this._markers) {
      marker.dispose();
    }
  }
}
