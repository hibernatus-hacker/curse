import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { invoke } from '@tauri-apps/api/core';
import '../styles/AIAssistant.css';

const AIAssistant = forwardRef(({ isEnabled, apiToken, currentFile, fileContent, onClose }, ref) => {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('AI Assistant activated! Panel is working correctly.');
  const [error, setError] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
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

  // Set initial message when component mounts
  useEffect(() => {
    console.log("Setting initial feedback");
    setFeedback('AI Assistant activated! Panel is working correctly.\n\nReady to analyze your code.');
  }, []);

  // Auto-scroll to bottom of feedback when it updates
  useEffect(() => {
    console.log("Feedback updated:", feedback);
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
    setFeedback('Starting analysis...\n\nConnecting to AI service...');
    setError(null);
    setIsStreaming(true);

    try {
      const extension = getFileExtension(currentFile);
      const fileName = getFileName(currentFile);

      // Update feedback to show progress
      setFeedback(prev => `${prev}\n\nPreparing to analyze ${fileName}...`);

      // Prepare the prompt with file information
      const prompt = `
File: ${fileName}
Content:
\`\`\`${extension.replace('.', '')}
${fileContent}
\`\`\`

Please provide feedback on this code, including:
1. Potential bugs or issues
2. Optimization suggestions
3. Best practices recommendations
4. Any other helpful insights
`;

      // System prompt from your CLI
      const systemPrompt = 'You are an expert senior polyglot software developer, architect and engineer providing feedback suggestions etc.';

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

      // Update feedback to show progress
      setFeedback(prev => `${prev}\n\nSending request to AI service...`);

      console.log("Sending request to create prediction:", {
        apiToken: `${apiToken.substring(0, 5)}...`,
        requestData
      });

      // Use the Tauri command to create a prediction
      try {
        // Update feedback to show we're waiting for the response
        setFeedback(prev => `${prev}\n\nWaiting for AI response...`);

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

        // Update feedback to show we're starting to stream
        setFeedback(prev => `${prev}\n\nReceived initial response. Starting to stream AI feedback...\n\n--- AI FEEDBACK BELOW ---\n\n`);

        // Poll for streaming updates
        await streamPrediction(predictionId);
      } catch (invokeError) {
        console.error("Error invoking create_prediction:", invokeError);
        throw new Error(`Failed to create prediction: ${invokeError}`);
      }

    } catch (error) {
      console.error('Error getting AI feedback:', error);
      setError(`Error: ${typeof error === 'string' ? error : error.message || 'Unknown error'}`);
      // Keep the existing feedback but add the error
      setFeedback(prev => `${prev}\n\nERROR: ${typeof error === 'string' ? error : error.message || 'Unknown error'}`);
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

            // Replace the placeholder with actual content
            setFeedback(prev => {
              const parts = prev.split('--- AI FEEDBACK BELOW ---\n\n');
              return parts[0] + '--- AI FEEDBACK BELOW ---\n\n' + outputText;
            });
          } else {
            console.log("No text could be extracted from output");
          }
        }

        // Check if prediction is complete
        if (data.status === 'succeeded') {
          console.log("Prediction succeeded!");
          completed = true;

          // Add completion message
          setFeedback(prev => `${prev}\n\n--- END OF AI FEEDBACK ---\n\nAnalysis completed successfully.`);
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
        // Add error to feedback
        setFeedback(prev => `${prev}\n\nStreaming error: ${typeof error === 'string' ? error : error.message || 'Unknown error'}`);
        completed = true;
      }
    }

    if (attempts >= maxAttempts && !completed) {
      setError('Timed out waiting for prediction results');
      setFeedback(prev => `${prev}\n\nTimed out waiting for prediction results. Please try again.`);
    }
  };

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <h3>AI Assistant</h3>
        <div className="ai-controls">
          <button
            className="analyze-button"
            onClick={requestFeedback}
            disabled={isLoading || !isEnabled || !apiToken}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Code'}
          </button>
          <button className="close-assistant" onClick={onClose}>×</button>
        </div>
      </div>

      <div className="ai-content" ref={feedbackRef}>
        {/* Always show feedback div */}
        <div className="ai-feedback">
          <pre>{feedback || 'No feedback available'}</pre>
        </div>

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
            <p>{isStreaming ? 'Streaming AI feedback...' : 'Requesting AI feedback...'}</p>
          </div>
        )}
      </div>
    </div>
  );
});

export default AIAssistant;
