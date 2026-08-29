export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, html, title, anon_id } = req.body;

  if (!html || !anon_id) {
    return res.status(400).json({ error: 'Missing html or anon_id' });
  }

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/sites`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify([{
        user_id: anon_id,
        prompt: prompt || '',
        html,
        title: (title || prompt || 'Untitled site').slice(0, 80)
      }])
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: `Supabase error: ${JSON.stringify(data)}` });
    }

    return res.status(200).json({ site: data[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
