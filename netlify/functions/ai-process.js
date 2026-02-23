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
  const base = `You are an expert DevRel and project management assistant for LaunchCue. You help developer relations teams organize thoughts, extract insights, and turn raw notes into structured, actionable output. Be concise and practical — DevRel teams move fast and need clarity, not fluff.`;

  if (enriched) {
    return `${base}

When context is provided (clients, projects, tasks, campaigns, calendar):
1. Reference specific clients, projects, or tasks by name when relevant.
2. Flag scheduling conflicts or overlapping commitments.
3. Connect new ideas to existing work — suggest linking to active projects.
4. Prioritize items based on existing deadlines and workload.
5. Note dependencies between new action items and existing tasks.`;
  }
  return base;
}

function buildUserPrompt(type, input, context) {
  let prompt = '';
  const contextString = context ? `\n\n--- Provided Context ---\n${context}\n--- End Context ---` : '';

  const jsonInstructions = `

IMPORTANT: After your written analysis, output a JSON code block with actionable items. Use exactly this format:

\`\`\`json
[
  {
    "title": "Short action title",
    "description": "What needs to be done and why",
    "type": "task",
    "priority": "high",
    "dueDate": "YYYY-MM-DD"
  }
]
\`\`\`

Valid types: "task", "event", "project". Valid priorities: "low", "medium", "high". Dates and assignees are optional.`;

  switch (type) {
    case 'summarize':
      prompt = `Summarize the following text clearly and concisely. Use markdown headings and bullets for structure. Lead with the most important takeaway.${contextString}\n\n--- Input Text ---\n${input}`; break;
    case 'keyPoints':
      prompt = `Extract the key points from the following text as a prioritized list. Group related points under headings. Mark anything time-sensitive or blocking.${contextString}\n\n--- Input Text ---\n${input}`; break;
    case 'organize':
      prompt = `Organize this raw text into a clean, structured document with clear headings, bullet points, and logical grouping. Preserve all information but improve readability.${contextString}\n\n--- Input Text ---\n${input}`; break;
    case 'actionItems':
      prompt = `Extract actionable next steps from this text. For each item, determine who should do it, the priority, and a reasonable deadline if one is implied.${contextString}\n\n--- Input Text ---\n${input}${jsonInstructions}`; break;
    case 'meetingNotes':
      prompt = `Process these meeting notes into a structured recap:

1. **Summary** — 2-3 sentence overview
2. **Key Decisions** — what was decided and by whom
3. **Action Items** — who does what by when
4. **Open Questions** — unresolved items needing follow-up
${contextString}
--- Input Text ---
${input}${jsonInstructions.replace('"type": "task"', '"type": "task or event"')}`; break;
    case 'patterns':
      prompt = `Analyze this text to identify recurring patterns, themes, and connections. Look for:
- Repeated topics or concerns
- Emerging trends across projects or clients
- Potential risks or opportunities
- Contradictions or misalignments
${contextString}\n\n--- Input Text ---\n${input}`; break;
    case 'creative':
      prompt = `Expand on the ideas in this text with creative, practical suggestions for a DevRel team. Think about content opportunities, community engagement angles, partnership ideas, and campaign concepts.${contextString}\n\n--- Input Text ---\n${input}`; break;
    default:
      prompt = `Summarize and organize the following text with clear structure:${contextString}\n\n--- Input Text ---\n${input}`; break;
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
      model = 'claude-sonnet-4-6',
      max_tokens = 4096
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
      const safeDetails = process.env.NODE_ENV === 'production' ? undefined : (error.message || 'Error calling Claude API');
      return createErrorResponse(500, 'AI processing failed', safeDetails);
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
    const safeDetails = process.env.NODE_ENV === 'production' ? undefined : error.message;
    return createErrorResponse(500, 'Internal Server Error', safeDetails);
  }
};
