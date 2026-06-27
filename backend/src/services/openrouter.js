const https = require('https');

/**
 * 3-strategy JSON extractor for AI responses.
 * 1) parse raw, 2) strip code fences, 3) extract first {...} block.
 */
function parseAIJson(text) {
  if (typeof text !== 'string') return null;
  try { return JSON.parse(text); } catch (e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (e) {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
  }
  return null;
}

async function queryOpenRouter(prompt, systemPrompt = '') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

  if (!apiKey || apiKey === 'your-openrouter-key-here') {
    return {
      analysis: 'AI analysis unavailable - please configure OPENROUTER_API_KEY in .env file',
      model: model,
      timestamp: new Date().toISOString(),
    };
  }

  const body = JSON.stringify({
    model: model,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt },
    ],
    max_tokens: 2000,
    temperature: 0.3,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Credit Risk Assessment Agent',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({
              analysis: `AI Error: ${parsed.error.message || 'Unknown error'}`,
              model: model,
              timestamp: new Date().toISOString(),
              raw: parsed,
            });
          } else {
            const content = parsed.choices?.[0]?.message?.content || 'No response';
            const parsedJson = parseAIJson(content);
            resolve({
              analysis: content,
              parsed: parsedJson, // structured fields when AI returned JSON, else null
              model: parsed.model || model,
              timestamp: new Date().toISOString(),
              usage: parsed.usage,
              ...(parsedJson && typeof parsedJson === 'object' ? parsedJson : {}),
            });
          }
        } catch (e) {
          resolve({
            analysis: 'Failed to parse AI response',
            model: model,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        analysis: `AI service error: ${e.message}`,
        model: model,
        timestamp: new Date().toISOString(),
      });
    });

    req.write(body);
    req.end();
  });
}

module.exports = { queryOpenRouter, parseAIJson };
