
import React, { useState, useEffect } from 'react';
// import { readDir } from '@tauri-apps/plugin-fs';
// import { open } from '@tauri-apps/plugin-dialog';

import { open } from '@tauri-apps/plugin-dialog';
import { readDir } from '@tauri-apps/plugin-fs';

function FileExplorer({ onFileSelect }) {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [expandedDirs, setExpandedDirs] = useState({});

  useEffect(() => {
    if (currentPath) {
      loadFilesForPath(currentPath);
    }
  }, [currentPath]);

  async function selectDirectory() {
    try {
      const selected = await open({
        directory: true,
        multiple: false
      });
      
      if (selected) {
        console.log("Selected directory:", selected);
        setCurrentPath(selected);
      }
    } catch (error) {
      console.error('Error selecting directory:', error);
    }
  }

  async function loadFilesForPath(path) {
    try {
      console.log("Loading files for path:", path);
      const entries = await readDir(path);
      
      console.log("Directory entries:", entries);
      
      // Sort directories first, then files alphabetically
      const sortedEntries = entries.sort((a, b) => {
        // Directories come first
        if ((a.children || a.isDirectory) && !(b.children || b.isDirectory)) return -1;
        if (!(a.children || a.isDirectory) && (b.children || b.isDirectory)) return 1;
        // Then sort alphabetically
        return a.name.localeCompare(b.name);
      });
      
      // Process entries to ensure they have path property
      const processedEntries = sortedEntries.map(entry => {
        // If entry doesn't have a path property, construct it
        if (!entry.path) {
          entry.path = `${path}/${entry.name}`;
        }
        return entry;
      });
      
      setFiles(processedEntries);
    } catch (error) {
      console.error('Error reading directory:', error);
    }
  }

  async function handleItemClick(item) {
    // Ensure item has a path
    if (!item.path && item.name) {
      item.path = `${currentPath}/${item.name}`;
    }
    
    const isDirectory = item.children || item.isDirectory;
    
    if (isDirectory) {
      // It's a directory
      const isExpanded = expandedDirs[item.path];
      
      if (!isExpanded) {
        // Load the directory contents if not already loaded
        try {
          const dirPath = item.path;
          console.log("Loading subdirectory:", dirPath);
          
          const entries = await readDir(dirPath);
          
          // Process entries to ensure they have path property
          const processedEntries = entries.map(entry => {
            if (!entry.path) {
              entry.path = `${dirPath}/${entry.name}`;
            }
            return entry;
          });
          
          const sortedEntries = processedEntries.sort((a, b) => {
            if ((a.children || a.isDirectory) && !(b.children || b.isDirectory)) return -1;
            if (!(a.children || a.isDirectory) && (b.children || b.isDirectory)) return 1;
            return a.name.localeCompare(b.name);
          });
          
          // Update the item with its children
          setFiles(prevFiles => {
            return prevFiles.map(file => {
              if (file.path === item.path) {
                return { ...file, children: sortedEntries };
              }
              return file;
            });
          });
        } catch (error) {
          console.error('Error loading directory contents:', error);
        }
      }
      
      // Toggle the expanded state
      setExpandedDirs(prev => ({
        ...prev,
        [item.path]: !isExpanded
      }));
    } else {
      // It's a file, pass it to the parent component
      console.log("Selected file path:", item.path);
      if (item.path) {
        onFileSelect(item.path);
      }
    }
  }

  function renderFileTree(items, level = 0) {
    if (!items || !Array.isArray(items)) {
      return null;
    }
    
    return items.map((item, index) => {
      if (!item) {
        console.warn("Invalid item in file tree:", item);
        return null;
      }
      
      // Ensure item has a path
      if (!item.path && item.name) {
        item.path = `${currentPath}/${item.name}`;
      }
      
      const isDirectory = item.children || item.isDirectory;
      const isExpanded = expandedDirs[item.path];
      const isElixirFile = !isDirectory && 
        (item.name.endsWith('.ex') || item.name.endsWith('.exs'));
      
      // Create a unique key using path or fallback to index
      const itemKey = item.path || `item-${level}-${index}`;
      
      return (
        <div key={itemKey}>
          <div 
            className={`file-item ${isDirectory ? 'directory' : 'file'} ${isElixirFile ? 'elixir-file' : ''}`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => handleItemClick(item)}
          >
            <span className="item-icon">
              {isDirectory 
                ? (isExpanded ? '📂' : '📁') 
                : isElixirFile 
                  ? '💧' // Elixir drop icon
                  : '📄'}
            </span>
            <span className="item-name">{item.name}</span>
          </div>
          
          {isDirectory && isExpanded && item.children && (
            <div className="nested-files">
              {renderFileTree(item.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <h3>curse</h3>
        <button onClick={selectDirectory}>
          {currentPath ? 'Change Folder' : 'Open Folder'}
        </button>
      </div>
      
      {currentPath && (
        <div className="current-path" title={currentPath}>
          {currentPath.split('/').pop() || currentPath}
        </div>
      )}
      
      <div className="file-tree">
        {currentPath ? (
          files.length > 0 ? (
            renderFileTree(files)
          ) : (
            <div className="empty-dir">This folder is empty</div>
          )
        ) : (
          <div className="no-folder-selected">
            <p>No folder opened</p>
            <p>Click "Open Folder" to browse your files</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FileExplorer;
