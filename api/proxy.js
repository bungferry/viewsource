// api/proxy.js
export default async function handler(req, res) {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing URL parameter ?url=' });
    }

    // Validasi agar hanya URL http/https yang diizinkan
    if (!/^https?:\/\//i.test(targetUrl)) {
      return res.status(400).json({ error: 'Invalid URL scheme. Use http or https only.' });
    }

    // Fetch ke URL target
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ViewSourceBot/1.0; +https://yourdomain.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    // Jika gagal
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch ${targetUrl} (${response.status} ${response.statusText})`
      });
    }

    // Ambil konten asli dari target
    const html = await response.text();

    // Izinkan CORS agar bisa diakses dari frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Kirim hasil HTML langsung ke browser
    return res.status(200).send(html);

  } catch (err) {
    console.error('Proxy Error:', err);
    return res.status(500).json({ error: 'Internal Serverless Proxy Error', details: err.message });
  }
}
