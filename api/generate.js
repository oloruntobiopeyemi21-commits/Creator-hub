export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          {
            role: "system",
            content: "You are a website generator. Given a description, output ONLY a complete, valid HTML document (starting with <!DOCTYPE html>). Include inline <style> for a clean, modern look. Do not include any explanation, markdown formatting, or code fences — output raw HTML only."
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

    return res.status(200).json({ html });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
