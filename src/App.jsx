import React, { useState, useEffect, useRef } from 'react';
import ElixirEditor from './components/Editor';
import FileExplorer from './components/FileExplorer';
import Settings from './components/Settings';
import AIAssistant from './components/AIAssistant';
import { readTextFile } from '@tauri-apps/plugin-fs';
import './App.css';

function App() {
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [aiPaneVisible, setAiPaneVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refactoredCode, setRefactoredCode] = useState('');
  const aiAssistantRef = useRef(null);
  const editorRef = useRef(null);
  const [settings, setSettings] = useState({
    theme: 'elixirDarkTheme',
    fontSize: 14,
    fontFamily: "'Fira Code', 'Droid Sans Mono', 'monospace'",
    lineNumbers: true,
    minimap: true,
    wordWrap: true,
    fontLigatures: true,
    tabSize: 2,
    autoIndent: true,
    replicateApiToken: '',
    enableAiIntegration: false,
    analyzeOnSave: true // Add this new setting
  });

  // Load settings from localStorage on initial load
  useEffect(() => {
    const savedSettings = localStorage.getItem('editorSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('editorSettings', JSON.stringify(settings));
  }, [settings]);

  // Function to handle applying refactored code
  const handleApplyRefactor = () => {
    if (refactoredCode && currentFile && editorRef.current) {
      const currentCode = editorRef.current.getValue();
      const mergedCode = intelligentlyMergeCode(currentCode, refactoredCode);
      editorRef.current.setValue(mergedCode);

      // Clear the refactored code to hide the button until next refactoring
      setRefactoredCode('');
    }
  };

  // Function to update refactored code (called from AIAssistant)
  const updateRefactoredCode = (code) => {
    setRefactoredCode(code);
  };

  // Function to intelligently merge original code with refactored code
  const intelligentlyMergeCode = (originalCode, refactoredCode) => {
    // If refactored code is empty or undefined, return original
    if (!refactoredCode) return originalCode;

    // If original code is empty, return refactored
    if (!originalCode) return refactoredCode;

    // Split both into lines for analysis
    const originalLines = originalCode.split('\n');
    const refactoredLines = refactoredCode.split('\n');

    // Case 1: If refactored code is a complete replacement (similar length or longer)
    // and has significant overlap with original, use it entirely
    if (refactoredLines.length >= originalLines.length * 0.8) {
      const overlapScore = calculateOverlap(originalLines, refactoredLines);
      if (overlapScore > 0.5) {
        return refactoredCode;
      }
    }

    // Case 2: Try to identify and replace specific functions or blocks
    const result = identifyAndReplaceBlocks(originalCode, refactoredCode);
    if (result !== originalCode) {
      return result;
    }

    // Case 3: If we can't identify specific blocks, try to merge line by line
    // with a preference for refactored code where there are differences
    return mergeLineByLine(originalCode, refactoredCode);
  };

  // Helper function to calculate overlap between two sets of lines
  const calculateOverlap = (originalLines, refactoredLines) => {
    let matchCount = 0;
    const originalSet = new Set(originalLines.map(line => line.trim()));

    for (const line of refactoredLines) {
      if (originalSet.has(line.trim())) {
        matchCount++;
      }
    }

    return matchCount / Math.max(originalLines.length, refactoredLines.length);
  };

  // Helper function to identify and replace code blocks (functions, classes, etc.)
  const identifyAndReplaceBlocks = (originalCode, refactoredCode) => {
    // This is a simplified implementation - a more robust solution would use a parser

    // Try to identify functions, classes, or other blocks in both versions
    const originalBlocks = extractCodeBlocks(originalCode);
    const refactoredBlocks = extractCodeBlocks(refactoredCode);

    let resultCode = originalCode;

    // For each refactored block, try to find and replace the corresponding original block
    for (const [refactoredName, refactoredBlock] of Object.entries(refactoredBlocks)) {
      if (originalBlocks[refactoredName]) {
        // Replace the original block with the refactored one
        resultCode = resultCode.replace(originalBlocks[refactoredName], refactoredBlock);
      } else {
        // This is a new block, add it at the end
        resultCode += '\n\n' + refactoredBlock;
      }
    }

    return resultCode;
  };

  // Helper function to extract code blocks (functions, classes, etc.)
  const extractCodeBlocks = (code) => {
    const blocks = {};

    // Regular expressions for common code structures
    // Note: These are simplified and won't work for all languages or edge cases
    const patterns = [
      // Function declarations: function name() { ... }
      /function\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}/g,

      // Arrow functions: const name = () => { ... }
      /const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>\s*{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}/g,

      // Classes: class Name { ... }
      /class\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+[a-zA-Z0-9_$.]+)?\s*{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}/g,

      // Object methods: name() { ... }
      /([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{([^{}]*(?:{[^{}]*(?:{[^{}]*}[^{}]*)*}[^{}]*)*)}/g
    ];

    // Apply each pattern to extract blocks
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const [fullMatch, name] = match;
        blocks[name] = fullMatch;
      }
    }

    return blocks;
  };

  // Helper function to merge code line by line
  const mergeLineByLine = (originalCode, refactoredCode) => {
    // This is a very simplified approach - a real implementation would be more sophisticated

    // If the refactored code is significantly different, prefer it
    if (calculateOverlap(originalCode.split('\n'), refactoredCode.split('\n')) < 0.3) {
      return refactoredCode;
    }

    // Otherwise, try to merge line by line
    const originalLines = originalCode.split('\n');
    const refactoredLines = refactoredCode.split('\n');
    const resultLines = [];

    // Use the longest of the two as the base length
    const maxLength = Math.max(originalLines.length, refactoredLines.length);

    for (let i = 0; i < maxLength; i++) {
      // If we've reached the end of original code but refactored has more, add the rest
      if (i >= originalLines.length) {
        resultLines.push(refactoredLines[i]);
        continue;
      }

      // If we've reached the end of refactored code, keep the original
      if (i >= refactoredLines.length) {
        resultLines.push(originalLines[i]);
        continue;
      }

      // If lines are identical, keep them
      if (originalLines[i].trim() === refactoredLines[i].trim()) {
        resultLines.push(originalLines[i]);
        continue;
      }

      // If lines are different, prefer the refactored one
      resultLines.push(refactoredLines[i]);
    }

    return resultLines.join('\n');
  };

  async function handleFileSelect(filePath) {
    if (!filePath) {
      console.error("No file path provided");
      return;
    }

    try {
      console.log("Reading file:", filePath);
      const content = await readTextFile(filePath);
      console.log("File content loaded successfully");
      setFileContent(content);
      setCurrentFile(filePath);
      // Clear any previous refactored code when loading a new file
      setRefactoredCode('');
    } catch (error) {
      console.error('Error reading file:', error);
    }
  }

  function toggleSidebar() {
    setSidebarVisible(!sidebarVisible);
  }

  function toggleAiPane() {
    setAiPaneVisible(!aiPaneVisible);
  }

  function openSettings() {
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
  }

  function handleSettingsChange(newSettings) {
    setSettings(newSettings);

    // If AI integration is disabled, close the AI pane
    if (!newSettings.enableAiIntegration && aiPaneVisible) {
      setAiPaneVisible(false);
    }
  }

  // Handle file save events
  function handleFileSave(filePath, content) {
    console.log("File saved:", filePath);

    // Update our state with the latest content
    setCurrentFile(filePath);
    setFileContent(content);

    // If AI integration is enabled and analyzeOnSave is true, analyze the file
    if (settings.enableAiIntegration && settings.analyzeOnSave && aiAssistantRef.current) {
      // Make sure the AI pane is visible
      if (!aiPaneVisible) {
        setAiPaneVisible(true);
      }

      // Trigger analysis
      setTimeout(() => {
        aiAssistantRef.current.analyze();
      }, 100); // Small delay to ensure state updates have propagated
    }
  }

  // Function to handle editor reference
  const handleEditorRef = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div className="app">
      <div className={`sidebar ${sidebarVisible ? 'visible' : 'hidden'}`}>
        <FileExplorer onFileSelect={handleFileSelect} />
      </div>

      <div className="editor-section">
        <div className="sidebar-toggle" onClick={toggleSidebar}>
          {sidebarVisible ? '◀' : '▶'}
        </div>

        <div className="main-toolbar">
          <div className="toolbar-left">
            {currentFile && (
              <span className="current-file">{currentFile.split('/').pop()}</span>
            )}
          </div>
          <div className="toolbar-right">
            {refactoredCode && (
              <button
                className="apply-refactor-button"
                onClick={handleApplyRefactor}
                title="Apply AI refactored code to editor"
              >
                Apply Refactor
              </button>
            )}
            {settings.enableAiIntegration && (
              <button
                className={`ai-button ${aiPaneVisible ? 'active' : ''}`}
                onClick={toggleAiPane}
                title="Toggle AI Assistant"
              >
                🤖 AI Assist
              </button>
            )}
            <button
              className="settings-button"
              onClick={openSettings}
              title="Open Settings"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        <div className="editor-container">
          <div className={`editor-pane ${aiPaneVisible ? 'with-ai' : 'full-width'}`}>
            <ElixirEditor
              currentFile={currentFile}
              initialContent={fileContent}
              settings={settings}
              onSave={handleFileSave}
              onEditorRef={handleEditorRef}
            />
          </div>

          {aiPaneVisible && (
            <div className="ai-pane">
              <AIAssistant
                ref={aiAssistantRef}
                isEnabled={settings.enableAiIntegration}
                apiToken={settings.replicateApiToken}
                currentFile={currentFile}
                fileContent={fileContent}
                onClose={toggleAiPane}
                onCodeUpdate={updateRefactoredCode}
              />
            </div>
          )}
        </div>
      </div>

      <Settings
        isOpen={settingsOpen}
        onClose={closeSettings}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}

export default App;
