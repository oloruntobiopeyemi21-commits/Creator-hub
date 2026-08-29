function slugify(text) {
  return (text || 'site')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 50) || 'site';
}

async function findUniqueSlug(base) {
  let candidate = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const checkUrl = `${process.env.SUPABASE_URL}/rest/v1/sites?slug=eq.${encodeURIComponent(candidate)}&select=id`;
    const checkResponse = await fetch(checkUrl, {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    });
    const existing = await checkResponse.json();
    if (!Array.isArray(existing) || existing.length === 0) {
      return candidate;
    }
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, html, title, anon_id } = req.body;

  if (!html || !anon_id) {
    return res.status(400).json({ error: 'Missing html or anon_id' });
  }

  try {
    const finalTitle = (title || prompt || 'Untitled site').slice(0, 80);
    const baseSlug = slugify(title || prompt || 'site');
    const slug = await findUniqueSlug(baseSlug);

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
        title: finalTitle,
        slug
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

