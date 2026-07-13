import { chromium } from 'playwright';

(async () => {
  console.log('Connecting to Chrome...');
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0] || await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to https://localhost:5173/...');
  await page.goto('https://localhost:5173/', { waitUntil: 'load', timeout: 10000 }).catch(e => console.log('Navigation timeout/error, proceeding anyway:', e.message));
  
  console.log('Waiting 2 seconds...');
  await page.waitForTimeout(2000);
  
  // Inspect header title & title accessory
  console.log('Inspecting page header...');
  const headerHtml = await page.evaluate(() => {
    const titleEl = document.querySelector('h1');
    const headerRow = titleEl?.parentElement;
    return headerRow ? headerRow.innerHTML : 'Header row not found';
  });
  console.log('Header HTML:\n', headerHtml);

  // Inspect rendered challenge buttons
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(btn => ({
      text: btn.innerText.replace(/\n/g, ' '),
      testid: btn.getAttribute('data-testid'),
      completed: btn.getAttribute('data-completed'),
      classes: btn.className
    })).filter(b => b.testid || b.text.includes('/') || b.text.toLowerCase().includes('challenge'));
  });
  
  console.log('Relevant Buttons Found:\n', JSON.stringify(buttons, null, 2));

  await page.close();
  await browser.close();
})().catch(err => {
  console.error('Error running script:', err);
});
