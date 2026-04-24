const https = require('https');

async function queryOpenRouter(prompt, systemPrompt = '') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

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
            resolve({
              analysis: content,
              model: parsed.model || model,
              timestamp: new Date().toISOString(),
              usage: parsed.usage,
              id: parsed.id,
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

module.exports = { queryOpenRouter };
