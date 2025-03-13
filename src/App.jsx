import React, { useState } from 'react';
import ElixirEditor from './components/Editor';
import FileExplorer from './components/FileExplorer';
import { readTextFile } from '@tauri-apps/plugin-fs';
import './App.css';

function App() {
  const [currentFile, setCurrentFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [sidebarVisible, setSidebarVisible] = useState(true);

  async function handleFileSelect(filePath) {
    if (!filePath) {
      console.error("No file path provided");
      return;
    }
    
    try {
      console.log("Reading file:", filePath); // Debug log
      
      // Make sure the path is properly formatted for Tauri
      const formattedPath = filePath.trim();
      
      if (!formattedPath) {
        console.error("Empty file path after formatting");
        return;
      }
      
      // Read the file with the proper path parameter
      const content = await readTextFile(formattedPath);
      
      console.log("File content loaded successfully");
      setFileContent(content);
      setCurrentFile(formattedPath);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  }

  function toggleSidebar() {
    setSidebarVisible(!sidebarVisible);
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
        <ElixirEditor 
          currentFile={currentFile} 
          initialContent={fileContent}
        />
      </div>
    </div>
  );
}

export default App;
