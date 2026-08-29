export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { anon_id } = req.query;

  if (!anon_id) {
    return res.status(400).json({ error: 'Missing anon_id' });
  }

  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/sites?user_id=eq.${encodeURIComponent(anon_id)}&select=id,title,prompt,slug,created_at&order=created_at.desc`;
    const response = await fetch(url, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: `Supabase error: ${JSON.stringify(data)}` });
    }

    return res.status(200).json({ sites: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
