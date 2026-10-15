import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';

const distDir = path.resolve('dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.join(distDir, reqPath);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(4173, async () => {
  const tmpDir = path.join(os.tmpdir(), 'chrome-pwa-test-' + Date.now());
  try {
    const context = await chromium.launchPersistentContext(tmpDir, {
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
      args: ['--enable-features=AppBanners']
    });
    const page = context.pages()[0] || await context.newPage();
    const client = await context.newCDPSession(page);

    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

    // Wait a couple seconds for service worker registration
    await page.waitForTimeout(2000);

    const result = await client.send('Page.getInstallabilityErrors');
    console.log('INSTALLABILITY_ERRORS:', JSON.stringify(result.installabilityErrors || []));

    await context.close();
  } catch (e) {
    console.error('CDP error:', e);
  } finally {
    server.close();
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
  }
});
