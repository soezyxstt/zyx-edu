import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const SHARED_SECRET = process.env.SHARED_SECRET;

app.use(express.json({ limit: '10mb' }));

function auth(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || auth !== `Bearer ${SHARED_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/render', auth, async (req, res) => {
  const { html } = req.body;
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'html must be a non-empty string' });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      scale: 1.0,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length });
    res.send(pdf);
  } catch (err) {
    console.error('[diktat-renderer] PDF generation failed:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`[diktat-renderer] listening on port ${PORT}`);
});
