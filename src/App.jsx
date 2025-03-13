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
  const aiAssistantRef = useRef(null);
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
