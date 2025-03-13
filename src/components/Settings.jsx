import React, { useState, useEffect } from 'react';
import '../styles/Settings.css';

function Settings({ isOpen, onClose, settings, onSettingsChange }) {
  const [localSettings, setLocalSettings] = useState(settings);

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Handle input changes
  const handleChange = (key, value) => {
    const updatedSettings = { ...localSettings, [key]: value };
    setLocalSettings(updatedSettings);
  };

  // Save settings
  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  // Reset to defaults
  const handleReset = () => {
    const defaultSettings = {
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
      analyzeOnSave: true
    };
    setLocalSettings(defaultSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>Editor Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3>Appearance</h3>
            
            <div className="setting-item">
              <label htmlFor="fontSize">Font Size</label>
              <input 
                type="number" 
                id="fontSize" 
                min="8" 
                max="32" 
                value={localSettings.fontSize} 
                onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
              />
            </div>
            
            <div className="setting-item">
              <label htmlFor="fontFamily">Font Family</label>
              <select 
                id="fontFamily" 
                value={localSettings.fontFamily} 
                onChange={(e) => handleChange('fontFamily', e.target.value)}
              >
                <option value="'Fira Code', 'Droid Sans Mono', 'monospace'">Fira Code</option>
                <option value="'Droid Sans Mono', 'monospace'">Droid Sans Mono</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Consolas', monospace">Consolas</option>
              </select>
            </div>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="fontLigatures" 
                checked={localSettings.fontLigatures} 
                onChange={(e) => handleChange('fontLigatures', e.target.checked)}
              />
              <label htmlFor="fontLigatures">Font Ligatures</label>
            </div>
          </div>
          
          <div className="settings-section">
            <h3>Editor</h3>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="lineNumbers" 
                checked={localSettings.lineNumbers} 
                onChange={(e) => handleChange('lineNumbers', e.target.checked)}
              />
              <label htmlFor="lineNumbers">Line Numbers</label>
            </div>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="minimap" 
                checked={localSettings.minimap} 
                onChange={(e) => handleChange('minimap', e.target.checked)}
              />
              <label htmlFor="minimap">Minimap</label>
            </div>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="wordWrap" 
                checked={localSettings.wordWrap} 
                onChange={(e) => handleChange('wordWrap', e.target.checked)}
              />
              <label htmlFor="wordWrap">Word Wrap</label>
            </div>
            
            <div className="setting-item">
              <label htmlFor="tabSize">Tab Size</label>
              <input 
                type="number" 
                id="tabSize" 
                min="1" 
                max="8" 
                value={localSettings.tabSize} 
                onChange={(e) => handleChange('tabSize', parseInt(e.target.value))}
              />
            </div>
            
            <div className="setting-item checkbox">
              <input 
                type="checkbox" 
                id="autoIndent" 
                checked={localSettings.autoIndent} 
                onChange={(e) => handleChange('autoIndent', e.target.checked)}
              />
              <label htmlFor="autoIndent">Auto Indent</label>
            </div>
          </div>
          
          <div className="settings-section">
            <h3>AI Integration</h3>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="enableAiIntegration"
                checked={localSettings.enableAiIntegration}
                onChange={(e) => handleChange('enableAiIntegration', e.target.checked)}
              />
              <label htmlFor="enableAiIntegration">Enable AI Integration</label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="analyzeOnSave"
                checked={localSettings.analyzeOnSave}
                onChange={(e) => handleChange('analyzeOnSave', e.target.checked)}
                disabled={!localSettings.enableAiIntegration}
              />
              <label htmlFor="analyzeOnSave">Analyze Code on Save</label>
            </div>

            <div className="setting-item">
              <label htmlFor="replicateApiToken">Replicate API Token</label>
              <input
                type="password"
                id="replicateApiToken"
                value={localSettings.replicateApiToken || ''}
                onChange={(e) => handleChange('replicateApiToken', e.target.value)}
                placeholder="Enter your Replicate API token"
                className="api-token-input"
              />
            </div>
            </div>
        </div>
        
        <div className="settings-footer">
          <button className="reset-button" onClick={handleReset}>Reset to Defaults</button>
          <div className="action-buttons">
            <button className="cancel-button" onClick={onClose}>Cancel</button>
            <button className="save-button" onClick={handleSave}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
