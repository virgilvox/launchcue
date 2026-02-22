const { connectToDb } = require('./utils/db');
const { authenticate } = require('./utils/authHandler');
const { createResponse, createErrorResponse, handleOptionsRequest } = require('./utils/response');
const logger = require('./utils/logger');
const { rateLimitCheck } = require('./utils/rateLimit');

// Only use server-side env var - never fall back to VITE_ prefixed keys
const anthropicApiKey = (process.env.ANTHROPIC_API_KEY || '').trim().replace(/^["']|["']$/g, '');

if (!anthropicApiKey) {
  logger.error('ANTHROPIC_API_KEY environment variable is not set');
}

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
[{"title": "Action item title", "description": "Details...", "type": "task", "dueDate": "YYYY-MM-DD" (optional), "priority": "medium" (optional)}]`; break;
    case 'meetingNotes':
      prompt = `Process the following meeting notes. Provide: 1. Summary 2. Key Decisions 3. Action Items. Consider the context.${contextString}\n\n--- Input Text ---\n${input}\n\n--- Instructions ---\nAfter the notes processing, provide ONLY a valid JSON array for actionable items/events discussed. Use this format inside the JSON array:
[{"title": "Task/Event title", "description": "Details...", "type": "task or event", "assignee": "Name" (optional), "dueDate": "YYYY-MM-DD" (optional), "eventDateTime": "YYYY-MM-DDTHH:mm:ssZ" (optional)}]`; break;
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
    const jsonCodeBlockMatch = aiText.match(/```(?:json)?\n([\s\S]*?)\n```/);
    if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
      try {
        structuredData = JSON.parse(jsonCodeBlockMatch[1]);
        textResponse = aiText.replace(jsonCodeBlockMatch[0], '').trim();
        return { response: textResponse, structuredData };
      } catch (parseError) {
        logger.debug('Failed to parse JSON from code block');
      }
    }

    const arrayMatch = aiText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        structuredData = JSON.parse(arrayMatch[0]);
        textResponse = aiText.replace(arrayMatch[0], '').trim();
        return { response: textResponse, structuredData };
      } catch (parseError) {
        logger.debug('Failed to parse JSON from array pattern');
      }
    }

    try {
      const potentialJson = aiText.trim();
      if ((potentialJson.startsWith('[') && potentialJson.endsWith(']')) ||
          (potentialJson.startsWith('{') && potentialJson.endsWith('}'))) {
        structuredData = JSON.parse(potentialJson);
        textResponse = '';
        return { response: textResponse, structuredData };
      }
    } catch (parseError) {
      // Not valid JSON
    }

    return { response: textResponse, structuredData: [] };
  } catch (error) {
    logger.error('Error in JSON parsing:', error.message);
    return { response: textResponse, structuredData: [] };
  }
}

// --- Netlify Function Handler ---

exports.handler = async function(event, context) {
  const optionsResponse = handleOptionsRequest(event);
  if (optionsResponse) return optionsResponse;

  let authResult;
  try {
    authResult = await authenticate(event, {
      requiredScopes: ['write:braindumps']
    });
  } catch (errorResponse) {
    if (errorResponse.statusCode) return errorResponse;
    return createErrorResponse(401, 'Authentication required');
  }

  if (event.httpMethod !== 'POST') {
    return createErrorResponse(405, 'Method Not Allowed');
  }

  const rateLimited = await rateLimitCheck(event, 'ai', authResult.userId);
  if (rateLimited) return rateLimited;

  try {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      return createErrorResponse(400, 'Invalid JSON in request body');
    }

    const {
      prompt: inputPrompt,
      processingDetails,
      model = 'claude-3-haiku-20240307',
      max_tokens = 1500
    } = body;

    if (!inputPrompt) {
      return createErrorResponse(400, 'Input prompt is required');
    }
    if (!processingDetails || !processingDetails.type) {
      return createErrorResponse(400, 'Processing details (including type) are required');
    }

    const { type, context: aiContext = '', enriched = false } = processingDetails;

    const systemPrompt = getBaseSystemPrompt(enriched);
    const userPrompt = buildUserPrompt(type, inputPrompt, aiContext);

    const params = {
      model: model,
      max_tokens: max_tokens,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt
    };

    logger.info(`Calling Anthropic API. Model: ${model}, Type: ${type}`);

    let apiResponse;
    try {
      const apiUrl = 'https://api.anthropic.com/v1/messages';

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
        logger.error('Claude API error:', response.status);
        throw new Error(`API request failed with status ${response.status}: ${errorData?.error?.message || response.statusText}`);
      }

      apiResponse = await response.json();
    } catch (error) {
      logger.error('Anthropic API call failed:', error.message);
      return createErrorResponse(500, 'AI processing failed', error.message || 'Error calling Claude API');
    }

    if (!apiResponse?.content || !apiResponse.content[0] || typeof apiResponse.content[0].text !== 'string') {
      logger.error('Unexpected Anthropic API response structure');
      return createErrorResponse(500, 'Invalid response structure from AI API');
    }
    const aiRawText = apiResponse.content[0].text;

    const parsedResult = parseAIResponse(aiRawText);

    if ((type === 'actionItems' || type === 'meetingNotes') &&
        Array.isArray(parsedResult.structuredData) &&
        parsedResult.structuredData.length > 0) {
      parsedResult.structuredData = parsedResult.structuredData
        .filter(item => item && typeof item === 'object' && item.title && item.type)
        .map(item => {
          if (item.type && typeof item.type === 'string') {
            item.type = item.type.toLowerCase().trim();
            if (['event', 'meeting', 'appointment'].includes(item.type)) {
              item.type = 'event';
            } else if (['task', 'todo', 'action', 'action item'].includes(item.type)) {
              item.type = 'task';
            } else if (['project', 'milestone'].includes(item.type)) {
              item.type = 'project';
            }
          }
          return item;
        });
    }

    logger.info('AI processing successful');
    return createResponse(200, parsedResult);
  } catch (error) {
    logger.error('Unhandled error in AI processing:', error.message);
    return createErrorResponse(500, 'Internal Server Error', error.message);
  }
};
