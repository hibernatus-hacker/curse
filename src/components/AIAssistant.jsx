import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { invoke } from '@tauri-apps/api/core';
import '../styles/AIAssistant.css';

const AIAssistant = forwardRef(({ isEnabled, apiToken, currentFile, fileContent, onClose }, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [refactoredCode, setRefactoredCode] = useState('');
  const feedbackRef = useRef(null);

  // Expose the requestFeedback method to parent components
  useImperativeHandle(ref, () => ({
    analyze: () => {
      if (isEnabled && apiToken && fileContent) {
        requestFeedback();
        return true;
      }
      return false;
    }
  }));

  // Auto-scroll to bottom of feedback when it updates
  useEffect(() => {
    if (feedbackRef.current) {
      feedbackRef.current.scrollTop = feedbackRef.current.scrollHeight;
    }
  }, [feedback]);

  // Function to get file extension
  const getFileExtension = (filename) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
  };

  // Function to get file name from path
  const getFileName = (filePath) => {
    if (!filePath) return 'untitled';
    const parts = filePath.split('/');
    return parts[parts.length - 1];
  };

  // Function to format code for display
  const formatCodeForDisplay = (code) => {
    if (!code) return '';

    // Escape HTML to prevent XSS
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    return `<pre class="formatted-code">${escapedCode}</pre>`;
  };

  // Function to clean code output
  const cleanCodeOutput = (text) => {
    // Remove markdown code blocks if present
    let cleanedText = text;

    // Remove ```language and ``` markers
    cleanedText = cleanedText.replace(/```[\w-]*\n/g, '');
    cleanedText = cleanedText.replace(/```/g, '');

    // Remove any explanatory text before or after the code
    // This is a simple heuristic - might need adjustment based on actual output
    const lines = cleanedText.split('\n');
    let codeStarted = false;
    let codeLines = [];

    for (const line of lines) {
      // Skip empty lines at the beginning
      if (!codeStarted && line.trim() === '') continue;

      // Consider code has started once we see a non-empty line
      codeStarted = true;
      codeLines.push(line);
    }

    return codeLines.join('\n');
  };

  // Function to request AI feedback
  const requestFeedback = async () => {
    if (!isEnabled || !apiToken) {
      setError('AI integration is disabled or missing API token');
      return;
    }

    if (!fileContent) {
      setError('No file content to analyze');
      return;
    }

    setIsLoading(true);
    setFeedback('');
    setError(null);
    setIsStreaming(true);
    setRefactoredCode('');

    try {
      const extension = getFileExtension(currentFile);
      const fileName = getFileName(currentFile);

      // Prepare the prompt with file information
      const prompt = `
File: ${fileName}
Content:
\`\`\`${extension.replace('.', '')}
${fileContent}
\`\`\`

Please re-write the code making improvements. Only provide the refactored code, no explanations or other text.
`;

      // System prompt from your CLI
      const systemPrompt = 'You are an expert senior polyglot software developer, architect who re-writes and refactors code. You do not give any other output apart from the re-written code provided. Do not include markdown code blocks or language identifiers in your response - just the raw code.';

      // Create the request data
      const requestData = {
        version: "anthropic/claude-3.7-sonnet", // Default model from your CLI
        input: {
          prompt: prompt,
          system_prompt: systemPrompt,
          max_tokens: 4096
        },
        stream: true
      };

      console.log("Sending request to create prediction:", {
        apiToken: `${apiToken.substring(0, 5)}...`,
        requestData
      });

      // Use the Tauri command to create a prediction
      try {
        const response = await invoke('create_prediction', {
          apiToken,
          requestData
        });

        console.log("Create prediction response:", response);

        if (!response || !response.id) {
          throw new Error('Failed to create prediction: No ID returned');
        }

        const predictionId = response.id;
        console.log("Prediction created with ID:", predictionId);

        // Poll for streaming updates
        await streamPrediction(predictionId);
      } catch (invokeError) {
        console.error("Error invoking create_prediction:", invokeError);
        throw new Error(`Failed to create prediction: ${invokeError}`);
      }

    } catch (error) {
      console.error('Error getting AI feedback:', error);
      setError(`Error: ${typeof error === 'string' ? error : error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // Function to extract text from output
  const extractOutputText = (output) => {
    if (typeof output === 'string') {
      return output;
    } else if (Array.isArray(output)) {
      return output.join('');
    } else if (output !== null && typeof output === 'object') {
      // Try to find text content in the object
      if (output.text) {
        return output.text;
      } else if (output.content) {
        return output.content;
      } else {
        return JSON.stringify(output, null, 2);
      }
    }
    return '';
  };

  // Function to stream prediction results
  const streamPrediction = async (predictionId) => {
    const pollInterval = 1000; // 1 second
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 1 minute max

    while (!completed && attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`Polling prediction status (attempt ${attempts})...`);

        // Use the Tauri command to get prediction status
        const data = await invoke('get_prediction', {
          apiToken,
          predictionId
        });

        console.log(`Prediction status (attempt ${attempts}):`, data);

        // Update with new output
        if (data.output) {
          console.log("Received output:", data.output);

          const outputText = extractOutputText(data.output);

          if (outputText) {
            console.log("Extracted output text:", outputText);

            // Clean the code output
            const cleanedCode = cleanCodeOutput(outputText);
            setRefactoredCode(cleanedCode);

            // Format and display the code
            const formattedCode = formatCodeForDisplay(cleanedCode);
            setFeedback(formattedCode);
          } else {
            console.log("No text could be extracted from output");
          }
        }

        // Check if prediction is complete
        if (data.status === 'succeeded') {
          console.log("Prediction succeeded!");
          completed = true;
        } else if (data.status === 'failed') {
          console.error("Prediction failed:", data.error);
          throw new Error(data.error || 'Prediction failed');
        } else {
          console.log(`Prediction status: ${data.status}, waiting ${pollInterval}ms before next poll...`);
          // Wait before polling again
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      } catch (error) {
        console.error('Error streaming prediction:', error);
        setError(`Streaming error: ${typeof error === 'string' ? error : error.message || 'Unknown error'}`);
        completed = true;
      }
    }

    if (attempts >= maxAttempts && !completed) {
      setError('Timed out waiting for prediction results');
    }
  };

  // Function to apply refactored code
  const applyRefactoredCode = () => {
    // You would need to implement this function to update the file content
    // This could involve a callback to the parent component or a Tauri command
    console.log("Applying refactored code:", refactoredCode);
    // Example: onApplyCode(refactoredCode);
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <h3>AI Code Refactor</h3>
        <div className="ai-controls">
          <button
            className="analyze-button"
            onClick={requestFeedback}
            disabled={isLoading || !isEnabled || !apiToken}
          >
            {isLoading ? 'Refactoring...' : 'Refactor Code'}
          </button>
          {refactoredCode && (
            <button
              className="apply-button"
              onClick={applyRefactoredCode}
              disabled={isLoading}
            >
              Apply Changes
            </button>
          )}
          <button className="close-assistant" onClick={onClose}>×</button>
        </div>
      </div>

      <div className="ai-content" ref={feedbackRef}>
        {!isEnabled && (
          <div className="ai-disabled">
            <p>AI integration is disabled. Enable it in Settings.</p>
          </div>
        )}

        {isEnabled && !apiToken && (
          <div className="ai-disabled">
            <p>Replicate API token is missing. Add it in Settings.</p>
          </div>
        )}

        {error && (
          <div className="ai-error">
            <p>{error}</p>
          </div>
        )}

        {isLoading && (
          <div className="ai-loading">
            <div className="loading-spinner"></div>
            <p>{isStreaming ? 'Generating refactored code...' : 'Preparing to refactor code...'}</p>
          </div>
        )}

        {/* Always show feedback div */}
        <div className="ai-feedback">
          {feedback ? (
            <div dangerouslySetInnerHTML={{ __html: feedback }} />
          ) : (
            <div className="empty-feedback">
              {!isLoading && 'Click "Refactor Code" to generate improvements'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default AIAssistant;
