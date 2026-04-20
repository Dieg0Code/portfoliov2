const {chromium} = require('playwright');
(async () => {
  const b = await chromium.launch();
  const d = await b.newContext({viewport:{width:1440,height:900}});
  const p = await d.newPage();
  await p.goto('http://localhost:3000/', {waitUntil:'networkidle'});
  await p.waitForTimeout(1500);
  const contact = await p.$('#contact');
  if (contact) {
    await contact.scrollIntoViewIfNeeded();
    await p.waitForTimeout(800);
    await contact.screenshot({path:'.codex-output/contact-after.png'});
  }
  const heights = await p.$$eval('.project-card', els => els.map(e => {
    const h3 = e.querySelector('h3');
    return { title: h3?.textContent?.trim() ?? '?', h: e.getBoundingClientRect().height };
  }));
  console.log(JSON.stringify(heights, null, 2));
  await b.close();
})();
