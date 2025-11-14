const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:6006/iframe.html?globals=&id=markdown-editor-markdowneditor--with-context-overlay&viewMode=story');
  await page.waitForTimeout(2000);
  
  // Click inside a WOD block to activate it
  await page.click('text=20:00 AMRAP');
  await page.waitForTimeout(1000);
  
  // Check document.body for our widget
  const bodyChildren = await page.evaluate(() => {
    const widgets = Array.from(document.body.children).filter(el => 
      el.className.includes('monaco-react-widget') || 
      el.id.includes('context-overlay')
    );
    return widgets.map(el => ({
      id: el.id,
      className: el.className,
      tagName: el.tagName,
      display: window.getComputedStyle(el).display,
      visibility: window.getComputedStyle(el).visibility,
      position: window.getComputedStyle(el).position,
      right: window.getComputedStyle(el).right,
      top: window.getComputedStyle(el).top,
      width: window.getComputedStyle(el).width,
      height: window.getComputedStyle(el).height,
      zIndex: window.getComputedStyle(el).zIndex,
      backgroundColor: window.getComputedStyle(el).backgroundColor,
      hasChildren: el.children.length > 0,
      innerHTML: el.innerHTML.substring(0, 200)
    }));
  });
  console.log('Widgets in document.body:', JSON.stringify(bodyChildren, null, 2));
  
  // Check Monaco overlay widgets container
  const monacoStructure = await page.evaluate(() => {
    const editor = document.querySelector('.monaco-editor');
    if (!editor) return 'No Monaco editor found';
    
    const overlayWidgets = editor.querySelector('.overlayWidgets');
    if (!overlayWidgets) return 'No overlayWidgets container';
    
    return {
      overlayWidgetsChildren: overlayWidgets.children.length,
      childrenData: Array.from(overlayWidgets.children).map(c => ({
        id: c.id,
        className: c.className,
        display: window.getComputedStyle(c).display,
        hasContent: c.innerHTML.length > 0
      }))
    };
  });
  console.log('Monaco overlayWidgets:', JSON.stringify(monacoStructure, null, 2));
  
  // Take a screenshot
  await page.screenshot({ path: 'overlay-debug.png', fullPage: true });
  console.log('Screenshot saved to overlay-debug.png');
  
  await page.waitForTimeout(5000);
  await browser.close();
})();
