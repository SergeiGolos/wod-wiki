import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
const base = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))))
const geometry = () => page.evaluate(() => {
  const view = document.querySelector('.cm-note-editor').__codemirrorView
  const caret = view.coordsAtPos(view.state.selection.main.head)
  return { head: view.state.selection.main.head, top: caret.top, bottom: caret.bottom, scrollY, viewportBottom: visualViewport.offsetTop + visualViewport.height }
})
const keyboard = async height => {
  await page.evaluate(height => {
    window.keyboardHeight = height
    visualViewport.dispatchEvent(new Event('resize'))
  }, height)
  await settle()
}

try {
  await page.goto(`${base}/journal/2099-08-05`)
  await page.getByRole('button', { name: 'Create a note', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.cm-note-editor')?.__codemirrorView)
  await page.evaluate(() => {
    const view = document.querySelector('.cm-note-editor').__codemirrorView
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: Array.from({ length: 50 }, (_, i) => `Mobile keyboard line ${i + 1}`).join('\n') } })
    view.contentDOM.blur()
    window.keyboardHeight = innerHeight
    Object.defineProperty(visualViewport, 'height', { configurable: true, get: () => window.keyboardHeight })
  })
  await settle()
  await page.evaluate(() => {
    const view = document.querySelector('.cm-note-editor').__codemirrorView
    window.scrollBy(0, view.coordsAtPos(view.state.doc.line(23).from).top - 650)
  })
  await settle()
  const point = await page.evaluate(() => {
    const view = document.querySelector('.cm-note-editor').__codemirrorView
    const rect = view.coordsAtPos(view.state.doc.line(23).from)
    return { x: rect.left + 8, y: (rect.top + rect.bottom) / 2 }
  })
  await page.mouse.click(point.x, point.y)
  await settle()
  const tapped = await geometry()
  assert(tapped.bottom > 600, 'Tap starts near the bottom of the screen')
  for (const height of [500, 400, 340]) {
    await keyboard(height)
    const current = await geometry()
    assert.equal(current.head, tapped.head, 'Keyboard movement preserves the tapped caret')
    assert(current.top >= 0 && current.bottom <= current.viewportBottom - 16, `Selected line must stay above keyboard: ${JSON.stringify(current)}`)
  }
  const revealed = await geometry()
  await keyboard(340)
  assert.equal((await geometry()).scrollY, revealed.scrollY, 'An already visible line must not jump')
  await page.evaluate(() => {
    const view = document.querySelector('.cm-note-editor').__codemirrorView
    view.contentDOM.blur()
    window.scrollBy(0, view.coordsAtPos(view.state.selection.main.head).top - 650)
  })
  await settle()
  const blurred = await geometry()
  await keyboard(400)
  assert.equal((await geometry()).scrollY, blurred.scrollY, 'Viewport changes must not scroll an unfocused editor')
  await page.locator('.cm-note-editor .cm-content').focus()
  await settle()
  const refocused = await geometry()
  assert.equal(refocused.head, tapped.head)
  assert(refocused.bottom <= refocused.viewportBottom - 16, 'Refocusing with keyboard open reveals the same caret')
  await page.evaluate(() => { delete visualViewport.height })
  await keyboard(844)
  assert.equal((await geometry()).scrollY, refocused.scrollY, 'Closing the keyboard must not jump the page')
  console.log('PASS mobile editor: tapped line, keyboard animation, stable selection, refocus, blur, and keyboard dismissal')
} finally {
  await browser.close()
}
