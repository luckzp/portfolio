const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PROJECT_ROOT = path.join(__dirname, '..');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'images');

// 优先使用系统已安装的 Chrome 或 Edge，避免下载 Chromium
function getExecutablePath() {
  const win = process.platform === 'win32';
  const candidates = win
    ? [
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe',
        process.env.PROGRAMFILES + '\\Microsoft\\Edge\\Application\\msedge.exe',
      ].filter(Boolean)
    : ['/usr/bin/google-chrome', '/usr/bin/chromium'];
  for (const exe of candidates) {
    if (exe && fs.existsSync(exe)) return exe;
  }
  return undefined;
}

async function takeScreenshots() {
  const data = JSON.parse(
    fs.readFileSync(path.join(PROJECT_ROOT, 'projects.json'), 'utf8')
  );
  const projects = data.projects.filter((p) => p.screenshot);

  if (projects.length === 0) {
    console.log('没有需要截图的项目（screenshot 字段）');
    return;
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  const executablePath = getExecutablePath();
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };
  if (executablePath) {
    launchOptions.executablePath = executablePath;
    console.log('使用浏览器:', executablePath);
  }

  const browser = await puppeteer.launch(launchOptions);

  for (const project of projects) {
    const filename = path.basename(project.screenshot);
    const filepath = path.join(IMAGES_DIR, filename);

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 750, deviceScaleFactor: 2 });
      await page.goto(project.url, {
        waitUntil: 'networkidle2',
        timeout: 15000,
      });
      await page.screenshot({
        path: filepath,
        type: 'png',
        fullPage: false,
      });
      await page.close();
      console.log('已保存:', filename);
    } catch (err) {
      console.error(`${project.title} (${project.url}):`, err.message);
    }
  }

  await browser.close();
  console.log('截图完成');
}

takeScreenshots().catch((err) => {
  console.error(err);
  process.exit(1);
});
