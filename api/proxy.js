export default async function handler(req, res) {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Parameter ?url= wajib diisi' });
    }

    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'URL harus diawali http atau https' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ViewSourceBot/1.0; +https://yourdomain.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Gagal fetch: ${response.statusText}` });
    }

    const html = await response.text();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).json({ error: 'Internal Serverless Proxy Error', details: err.message });
  }
}
