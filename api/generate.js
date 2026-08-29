export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const DAILY_LIMIT = 10;

  try {
    // ---- Rate limit check ----
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const countUrl = `${process.env.SUPABASE_URL}/rest/v1/generation_log?ip=eq.${encodeURIComponent(ip)}&created_at=gte.${since}&select=id`;
    const countResponse = await fetch(countUrl, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    const existingLogs = await countResponse.json();
    const usedToday = Array.isArray(existingLogs) ? existingLogs.length : 0;

    if (usedToday >= DAILY_LIMIT) {
      return res.status(429).json({
        error: `You've reached today's free limit (${DAILY_LIMIT} generations). Try again tomorrow, or join the waitlist for higher limits at launch.`
      });
    }

    // ---- Log this request (best-effort, don't block generation if this fails) ----
    fetch(`${process.env.SUPABASE_URL}/rest/v1/generation_log`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ ip }])
    }).catch(() => {});

    // ---- Generate ----
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        max_tokens: 3000,
        messages: [
          {
            role: "system",
            content: "You are an expert website generator. Given a description, output ONLY a complete, valid, single-file HTML document (starting with <!DOCTYPE html>). Requirements: include a <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"> tag so it works on mobile; use inline <style> with a clean, modern, professional design (good spacing, a cohesive color scheme, readable typography); include realistic, relevant sample content for the topic described — never use generic placeholder text like 'Lorem Ipsum' or '[Your text here]'; structure the page with a clear header/nav, a hero section, at least one content section, and a footer, as appropriate to the request. Do not include any explanation, commentary, markdown formatting, or code fences before or after the HTML — output raw HTML only, nothing else."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: `OpenRouter returned ${response.status}: ${JSON.stringify(data)}`
      });
    }

    let html = data.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if the model wrapped the HTML in them anyway
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    if (!html){
      return res.status(500).json({ error: 'No content returned from the model' });
    }

    return res.status(200).json({ html, remaining: DAILY_LIMIT - usedToday - 1 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

