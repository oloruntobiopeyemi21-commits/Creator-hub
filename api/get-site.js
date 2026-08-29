export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/sites?id=eq.${encodeURIComponent(id)}&select=html,title`;
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

    if (!data[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    return res.status(200).json({ site: data[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
