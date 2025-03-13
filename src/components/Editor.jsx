import React, { useRef, useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

function ElixirEditor({ currentFile, initialContent }) {
  const editorRef = useRef(null);
  const [fileName, setFileName] = useState(null);
  const [theme, setTheme] = useState("elixirDarkTheme"); // Set default theme

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.setValue(initialContent);
    }
  }, [initialContent]);

  // Update fileName when currentFile changes
  useEffect(() => {
    if (currentFile) {
      const parts = currentFile.split('/');
      setFileName(parts[parts.length - 1]);
    } else {
      setFileName(null);
    }
  }, [currentFile]);

  async function handleOpenFile() {
    try {
      const selected = await open({
        filters: [{
          name: 'Elixir Files',
          extensions: ['ex', 'exs']
        }]
      });
      
      if (selected) {
        const content = await readTextFile(selected);
        editorRef.current.setValue(content);
        setFileName(selected.split('/').pop());
      }
    } catch (error) {
      console.error('Error opening file:', error);
    }
  }

  async function handleSaveFile() {
    try {
      if (!currentFile) {
        const savePath = await save({
          filters: [{
            name: 'Elixir Files',
            extensions: ['ex', 'exs']
          }]
        });
        
        if (savePath) {
          await writeTextFile(savePath, editorRef.current.getValue());
          setFileName(savePath.split('/').pop());
        }
      } else {
        await writeTextFile(currentFile, editorRef.current.getValue());
      }
    } catch (error) {
      console.error('Error saving file:', error);
    }
  }

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    
    // Register Elixir language if not already registered
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'elixir')) {
      monaco.languages.register({ id: 'elixir' });
      
      // Define Elixir syntax highlighting rules
      monaco.languages.setMonarchTokensProvider('elixir', {
        tokenizer: {
          root: [
            // Comments
            [/#.*$/, 'comment'],
            
            // Strings
            [/"([^"\\]|\\.)*$/, 'string.incomplete'],
            [/'([^'\\]|\\.)*$/, 'string.incomplete'],
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
            
            // Keywords
            [/\b(def|defp|defmodule|defprotocol|defimpl|defmacro|defstruct|defdelegate|defexception|defoverridable|defguard|defguardp)\b/, 'keyword'],
            [/\b(do|end|case|when|if|else|unless|try|catch|rescue|after|raise|throw|import|require|alias|use|quote|unquote|super|with)\b/, 'keyword'],
            [/\b(fn|for|cond|receive|send|exit|spawn|spawn_link|spawn_monitor)\b/, 'keyword'],
            
            // Atoms
            [/:[a-zA-Z_][a-zA-Z0-9_]*/, 'constant'],
            
            // Module attributes
            [/@[a-zA-Z_][a-zA-Z0-9_]*/, 'variable'],
            
            // Numbers
            [/\b\d+\b/, 'number'],
            [/\b0x[a-fA-F\d]+\b/, 'number.hex'],
            [/\b\d+\.\d+([eE][-+]?\d+)?\b/, 'number.float'],
            
            // Variables
            [/[A-Z][a-zA-Z0-9_]*/, 'type'],
            [/[a-z_][a-zA-Z0-9_]*/, 'identifier'],
            
            // Operators
            [/[=><!~?:&|+\-*\/\^%]+/, 'operator'],
            
            // Punctuation
            [/[\[\](){},;.]/, 'delimiter'],
          ],
          
          string_double: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop']
          ],
          
          string_single: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape'],
            [/'/, 'string', '@pop']
          ]
        }
      });
    }
    
    // Define a beautiful dark theme for Elixir
    monaco.editor.defineTheme('elixirDarkTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'constant', foreground: '4EC9B0' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'identifier', foreground: 'DCDCAA' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'delimiter', foreground: 'D4D4D4' }
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editorCursor.foreground': '#AEAFAD',
        'editor.lineHighlightBackground': '#2D2D30',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41'
      }
    });
    
    // Set the theme immediately after defining it
    monaco.editor.setTheme('elixirDarkTheme');
  }

  // Define the default code as a separate variable to avoid parsing issues
  const defaultElixirCode = `defmodule HelloWorld do
  @moduledoc """
  A simple Hello World module
  """
  
  @doc """
  Prints Hello, World!
  """
  def hello do
    IO.puts("Hello, World!")
  end
end`;

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <button onClick={handleOpenFile}>Open</button>
        <button onClick={handleSaveFile}>Save</button>
        {fileName && <span className="current-file">{fileName}</span>}
      </div>
      <Editor
        height="calc(100vh - 40px)"
        defaultLanguage="elixir"
        defaultValue={initialContent || defaultElixirCode}
        onMount={handleEditorDidMount}
        theme={theme}
        options={{
          fontSize: 14,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers: 'on',
          wordWrap: 'on',
          folding: true,
          renderLineHighlight: 'all',
          fontFamily: "'Fira Code', 'Droid Sans Mono', 'monospace'",
          fontLigatures: true
        }}
      />
    </div>
  );
}

export default ElixirEditor;
