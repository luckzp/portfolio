import { readFile, writeFile } from 'fs/promises';

async function fetchTitle(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    // Try og:title, then msg_title (WeChat), then <title> tag
    const og = html.match(/og:title[^>]+content="([^"]*)"/);
    if (og) return og[1].trim();
    const msg = html.match(/var\s+msg_title\s*=\s*'([^']*)'/);
    if (msg) return msg[1].trim();
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (title) return title[1].trim();
    return null;
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err.message);
    return null;
  }
}

async function main() {
  const data = JSON.parse(await readFile('projects.json', 'utf-8'));

  for (const article of data.articles) {
    const title = await fetchTitle(article.url);
    if (title) {
      console.log(`${article.id}: ${title}`);
      article.title = title;
    } else {
      console.log(`${article.id}: failed to fetch title, keeping "${article.title}"`);
    }
  }

  await writeFile('projects.json', JSON.stringify(data, null, 2) + '\n');
  console.log('\nprojects.json updated.');
}

main();
