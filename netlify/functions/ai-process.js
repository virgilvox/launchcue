const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const { connectToDb } = require('./utils/db');
const { authenticateRequest } = require('./utils/auth');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');

// Initialize Anthropic client with API key explicitly rather than relying on env vars
let anthropicApiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_API_KEY;
if (!anthropicApiKey) {
  console.error("ANTHROPIC_API_KEY or VITE_API_KEY environment variable is not set!");
}

// Clean up the API key - make sure it doesn't have quotes or whitespace
if (anthropicApiKey) {
  anthropicApiKey = anthropicApiKey.trim().replace(/^["']|["']$/g, '');
}

// Log key format for debugging - only log a safe prefix
console.log("Using API key format:", anthropicApiKey ? 
  `${anthropicApiKey.substring(0, 12)}...` + 
  ` (length: ${anthropicApiKey.length}, starts with: ${anthropicApiKey.startsWith('sk-ant-')})` : 
  "No API key available");

// Create an axios instance for Anthropic API calls
const anthropicAxios = axios.create({
  baseURL: 'https://api.anthropic.com',
  headers: {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'x-api-key': anthropicApiKey,
  },
  // Add timeout and better error handling
  timeout: 30000, // 30 second timeout
});

// --- Prompt Engineering Helpers --- 

function getBaseSystemPrompt(enriched) {
    if (enriched) {
        return `You are an expert assistant helping organize thoughts, extract insights, and identify actionable items from text, using provided context effectively.
        When analyzing the input text:
        1. Consider the provided context (clients, projects, meetings, tasks) to identify connections, conflicts, or opportunities.
        2. Detect patterns across past context and current input.
        3. Be aware of existing commitments when suggesting new actions.
        4. Flag potential conflicts with existing context.
        5. Identify opportunities to leverage past decisions or resources.`;
    } else {
        return 'You are an expert assistant helping organize thoughts, extract insights, and identify actionable items from text.';
    }
}

function buildUserPrompt(type, input, context) {
    let prompt = '';
    const contextString = context ? `\n\n--- Provided Context ---\n${context}\n--- End Context ---` : '';

    switch (type) {
        case 'summarize':
            prompt = `Summarize the following text clearly and concisely:${contextString}\n\n--- Input Text ---\n${input}`; break;
        case 'keyPoints':
            prompt = `Extract and list the key points from the following text:${contextString}\n\n--- Input Text ---\n${input}`; break;
        case 'organize':
            prompt = `Organize the following text into a structured format (headings, bullets, etc.):${contextString}\n\n--- Input Text ---\n${input}`; break;
        case 'actionItems':
            prompt = `Review the following text and generate a list of actionable items/next steps. Consider the provided context when forming these items.${contextString}\n\n--- Input Text ---\n${input}\n\n--- Instructions ---\nAfter the list, provide ONLY a valid JSON array containing objects for each actionable item. Use this format inside the JSON array:
[{\"title\": \"Action item title\", \"description\": \"Details...\", \"type\": \"task\", \"dueDate\": \"YYYY-MM-DD\" (optional), \"priority\": \"medium\" (optional)}]`; break;
        case 'meetingNotes':
            prompt = `Process the following meeting notes. Provide: 1. Summary 2. Key Decisions 3. Action Items. Consider the context.${contextString}\n\n--- Input Text ---\n${input}\n\n--- Instructions ---\nAfter the notes processing, provide ONLY a valid JSON array for actionable items/events discussed. Use this format inside the JSON array:
[{\"title\": \"Task/Event title\", \"description\": \"Details...\", \"type\": \"task or event\", \"assignee\": \"Name\" (optional), \"dueDate\": \"YYYY-MM-DD\" (optional), \"eventDateTime\": \"YYYY-MM-DDTHH:mm:ssZ\" (optional)}]`; break;
        case 'patterns':
             prompt = `Analyze the text and provided context to identify patterns, themes, or connections:${contextString}\n\n--- Input Text ---\n${input}`; break;
        case 'creative':
             prompt = `Expand creatively on the ideas in the text, leveraging the context:${contextString}\n\n--- Input Text ---\n${input}`; break;
        default:
            prompt = `Summarize and organize the following text:${contextString}\n\n--- Input Text ---\n${input}`; break;
    }
    return prompt;
}

function parseAIResponse(aiText) {
    let structuredData = [];
    let textResponse = aiText;
    try {
        // Try multiple possible formats for JSON data
        
        // 1. First, try extracting JSON from code blocks (```json ... ```)
        const jsonCodeBlockMatch = aiText.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
            try {
                structuredData = JSON.parse(jsonCodeBlockMatch[1]);
                // Remove the JSON block from the text response for cleaner display
                textResponse = aiText.replace(jsonCodeBlockMatch[0], '').trim();
                console.log("Successfully parsed JSON from code block", structuredData);
                return { response: textResponse, structuredData };
            } catch (parseError) {
                console.warn('Failed to parse JSON from code block:', parseError);
                // Continue to try other formats
            }
        }
        
        // 2. Try finding array-like structure with [ ... ] pattern
        const arrayMatch = aiText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
            try {
                structuredData = JSON.parse(arrayMatch[0]);
                // Remove the JSON from the text response
                textResponse = aiText.replace(arrayMatch[0], '').trim();
                console.log("Successfully parsed JSON from array pattern", structuredData);
                return { response: textResponse, structuredData };
            } catch (parseError) {
                console.warn('Failed to parse JSON from array pattern:', parseError);
                // Continue to try other formats
            }
        }
        
        // 3. Check if the entire response is a valid JSON
        try {
            const potentialJson = aiText.trim();
            if ((potentialJson.startsWith('[') && potentialJson.endsWith(']')) || 
                (potentialJson.startsWith('{') && potentialJson.endsWith('}'))) {
                structuredData = JSON.parse(potentialJson);
                textResponse = ''; // Assume the whole response was JSON
                console.log("Successfully parsed entire response as JSON", structuredData);
                return { response: textResponse, structuredData };
            }
        } catch (parseError) {
            console.warn('Failed to parse entire response as JSON:', parseError);
        }

        // If we got here, no valid JSON was found
        console.warn('No valid JSON structure found in AI response');
        return { response: textResponse, structuredData: [] };
        
    } catch (error) {
        console.error('Error in JSON parsing:', error);
        return { response: textResponse, structuredData: [] };
    }
}

// --- Netlify Function Handler --- 

exports.handler = async function(event, context) {
    // Handle CORS preflight requests
    const optionsResponse = handleOptionsRequest(event);
    if (optionsResponse) return optionsResponse;

    // Log request details
    console.log(`AI Process function called with method: ${event.httpMethod}, path: ${event.path}`);

    // Verify authentication
    let authResult;
    try {
        // Authenticate the request
        authResult = authenticateRequest(event);
        if (!authResult || authResult.error) {
            console.error('Authentication failed:', authResult?.error || 'No auth result');
            return createErrorResponse(401, 'Authentication required', authResult?.error);
        }
        console.log('Authentication successful for user:', authResult.userId);
    } catch (error) {
        console.error('Error during authentication:', error);
        return createErrorResponse(401, 'Authentication error', error.message);
    }

    // Only allow POST method
    if (event.httpMethod !== 'POST') {
        console.error(`Method not allowed: ${event.httpMethod}`);
        return createErrorResponse(405, 'Method Not Allowed');
    }

    try {
        // Parse request body
        let body;
        try {
            body = JSON.parse(event.body);
            console.log('Request body received:', { 
                prompt: body.prompt ? `${body.prompt.substring(0, 50)}...` : 'missing',
                type: body.processingDetails?.type || 'missing'
            });
        } catch (parseError) {
            console.error('Failed to parse request body:', parseError);
            return createErrorResponse(400, 'Invalid JSON in request body');
        }

        // Validate required fields
        const { 
            prompt: inputPrompt, // Renamed for clarity within this function
            processingDetails, 
            model = 'claude-3-haiku-20240307', 
            max_tokens = 1500 // Increased default max tokens slightly
        } = body;

        if (!inputPrompt) {
            console.error('Missing required field: prompt');
            return createErrorResponse(400, 'Input prompt is required');
        }
        if (!processingDetails || !processingDetails.type) {
            console.error('Missing required field: processingDetails.type');
            return createErrorResponse(400, 'Processing details (including type) are required');
        }

        const { type, context = '', enriched = false } = processingDetails;

        // 1. Build the final prompts for Claude
        const systemPrompt = getBaseSystemPrompt(enriched);
        const userPrompt = buildUserPrompt(type, inputPrompt, context);

        // 2. Prepare API parameters
        const params = {
            model: model,
            max_tokens: max_tokens,
            messages: [{ role: 'user', content: userPrompt }],
            system: systemPrompt
        };

        // 3. Call Claude API
        console.log(`Calling Anthropic API. Model: ${model}, Type: ${type}, Enriched: ${enriched}`);
        
        let apiResponse;
        try {
            // Prepare request based on official Anthropic documentation
            const apiUrl = 'https://api.anthropic.com/v1/messages';
            
            console.log("Making API request to Claude with params:", {
                url: apiUrl,
                model: params.model,
                system_length: params.system?.length || 0,
                message_length: params.messages[0]?.content?.length || 0
            });
            
            // Use fetch() instead of axios for simplicity
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01',
                    'x-api-key': anthropicApiKey,
                },
                body: JSON.stringify(params),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Claude API error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: errorData
                });
                throw new Error(`API request failed with status ${response.status}: ${errorData?.error?.message || response.statusText}`);
            }
            
            apiResponse = await response.json();
            console.log("Claude API response status:", response.status);
        } catch (error) {
            console.error('Anthropic API call failed:', {
                message: error.message,
                cause: error.cause
            });
            
            // Provide more detailed error information
            return createErrorResponse(
                500, 
                'AI processing failed', 
                error.message || 'Error calling Claude API'
            );
        }
        
        // Check if response structure is as expected
        if (!apiResponse?.content || !apiResponse.content[0] || typeof apiResponse.content[0].text !== 'string') {
             console.error("Unexpected Anthropic API response structure:", apiResponse);
             return createErrorResponse(500, "Invalid response structure from AI API");
        }
        const aiRawText = apiResponse.content[0].text;
        console.log("Raw AI Response received:", aiRawText.substring(0, 200) + "..."); // Log snippet

        // 4. Parse the response for text and structured data
        const parsedResult = parseAIResponse(aiRawText);
        console.log("Parsed Structured Data:", JSON.stringify(parsedResult.structuredData).substring(0, 200) + "...");
        
        // Add extra validation for action items and meeting notes types
        if ((type === 'actionItems' || type === 'meetingNotes') && 
            Array.isArray(parsedResult.structuredData) && 
            parsedResult.structuredData.length > 0) {
                
            // Validate each item has required fields
            parsedResult.structuredData = parsedResult.structuredData
                .filter(item => {
                    const isValid = item && typeof item === 'object' && item.title && item.type;
                    if (!isValid) {
                        console.warn('Filtered out invalid item from AI response:', item);
                    }
                    return isValid;
                })
                .map(item => {
                    // Ensure proper type value
                    if (item.type && typeof item.type === 'string') {
                        item.type = item.type.toLowerCase().trim();
                        // Normalize types
                        if (item.type === 'event' || item.type === 'meeting' || item.type === 'appointment') {
                            item.type = 'event';
                        } else if (item.type === 'task' || item.type === 'todo' || item.type === 'action' || item.type === 'action item') {
                            item.type = 'task';
                        } else if (item.type === 'project' || item.type === 'milestone') {
                            item.type = 'project';
                        }
                    }
                    return item;
                });
        }

        // 5. Optional: Log request/response (consider PII)
        // const { db } = await connectToDb();
        // await db.collection('ai_logs').insertOne({ userId, teamId, request: params, rawResponse: aiRawText, parsedResponse: parsedResult, timestamp: new Date() });

        console.log('AI processing successful, returning response');
        // 6. Return structured response to frontend
        return createResponse(200, parsedResult); // Sending { response: ..., structuredData: ... }
        
    } catch (error) {
        console.error('Unhandled error in AI processing:', error);
        
        if (error instanceof Anthropic.APIError) {
            console.error('Anthropic API error details:', {
                status: error.status,
                name: error.name,
                message: error.message
            });
            return createErrorResponse(error.status || 500, `AI API Error: ${error.name}`, error.message);
        } else {
            return createErrorResponse(500, 'Internal Server Error', error.message);
        }
    }
}; 