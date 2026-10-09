import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
})
const page = await browser.newPage()
const url = process.env.BASE_URL ?? 'http://127.0.0.1:5175/'

async function settle() {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

async function enter(id, progress = 0.1) {
  await page.evaluate(({ id, progress }) => {
    document.activeElement?.blur()
    const runway = document.querySelector(`#tour-section-${id} [data-testid="tour-runway"]`)
    if (!runway) throw new Error(`Missing runway ${id}`)
    window.scrollTo({ top: scrollY + runway.getBoundingClientRect().top + progress * (runway.offsetHeight - innerHeight), behavior: 'instant' })
  }, { id, progress })
  await settle()
}

async function swipe(x, y, distance = -160) {
  const client = await page.context().newCDPSession(page)
  try {
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 10; i++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + distance * i / 10 }] })
      await page.waitForTimeout(20)
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(300)
  } finally {
    await client.detach()
  }
}

async function scrollFrom(selector, touch, distance = -160) {
  const target = await page.locator(selector).first().elementHandle()
  assert(target, `Gesture target ${selector}`)
  const box = await target.boundingBox()
  assert(box && box.height > 0, `Visible gesture target ${selector}`)
  const before = await page.evaluate(() => scrollY)
  const innerBefore = await target.evaluate(el => el.scrollTop)
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  if (touch) await swipe(x, y, distance)
  else {
    await page.mouse.move(x, y)
    await page.mouse.wheel(0, -distance)
    await page.waitForTimeout(300)
  }
  const after = await page.evaluate(() => scrollY)
  assert(distance < 0 ? after > before : after < before, `${selector} must move the page in gesture direction: ${before} -> ${after}`)
  assert.equal(await target.evaluate(el => el.scrollTop), innerBefore, `${selector} must not consume the page gesture`)
  await target.dispose()
}

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }]) {
    const touch = viewport.width < 1000
    await page.setViewportSize(viewport)
    const client = await page.context().newCDPSession(page)
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: touch })
    await client.detach()
    await page.goto(url)
    await page.locator('[data-gate-id="hero-pane"] .cm-content').waitFor()
    await page.evaluate(() => document.activeElement?.blur())
    await scrollFrom('[data-gate-id="hero-pane"] .cm-scroller', touch, touch ? -100 : -160)

    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }) })
    await settle()
    await page.locator('[data-gate-id="hero-pane"] .cm-content').focus()
    await settle()
    assert.equal(await page.locator('[data-gate-id="hero-pane"]').getAttribute('data-scroll-gate'), 'captured', 'Editor focus must survive driver registration')

    await enter('write')
    await scrollFrom('[data-gate-id="write-pane"] .cm-scroller', touch)
    await enter('write')
    await scrollFrom('[data-gate-id="write-captions"] [data-scroll-pane]:not([inert])', touch)
    await enter('write')
    const gate = page.locator('[data-gate-id="write-captions"]')
    assert.equal(await page.locator('[data-gate-id="hero-pane"]').getAttribute('data-scroll-gate'), 'yield', 'Segment handoff releases the editor')
    await gate.locator(':scope > button').click()
    await settle()
    assert.equal(await gate.getAttribute('data-scroll-gate'), 'captured')
    const pane = gate.locator('[data-scroll-pane]:not([inert])')
    const content = await pane.evaluate(el => {
      el.scrollTop = el.scrollHeight
      const action = el.querySelector('a')
      return { overflow: getComputedStyle(el).overflowY, height: el.clientHeight, total: el.scrollHeight, scroll: el.scrollTop, actionBottom: action?.getBoundingClientRect().bottom, bottom: el.getBoundingClientRect().bottom }
    })
    assert.equal(content.overflow, 'auto')
    if (content.total > content.height) assert(content.scroll > 0 && content.actionBottom <= content.bottom + 1, 'Overflowing caption action must be reachable')
    if (content.total > content.height) {
      const before = await page.evaluate(() => scrollY)
      const box = await pane.boundingBox()
      assert(box)
      if (touch) await swipe(box.x + box.width / 2, box.y + box.height / 2, -60)
      else { await pane.hover(); await page.mouse.wheel(0, 60); await page.waitForTimeout(300) }
      assert(await page.evaluate(() => scrollY) > before, 'Captured panel boundary must chain to the page')
    }
    await gate.locator(':scope > button').press('Escape')
    assert.equal(await gate.getAttribute('data-scroll-gate'), 'yield')
    await gate.locator(':scope > button').click()
    await enter('explore', 0.05)
    assert.equal(await gate.getAttribute('data-scroll-gate'), 'yield', 'Section transition releases the reading panel')

    const vocabulary = page.locator('[data-gate-id="explore-pane"] [data-testid="tour-session-vocab"]')
    await vocabulary.waitFor()
    await scrollFrom('[data-gate-id="explore-pane"] [data-testid="tour-session-vocab"]', touch)
    for (const [id, progress] of [['run', 0.2], ['own', 0.2], ['explore', 0.7]]) {
      await enter(id, progress)
      await scrollFrom(`[data-gate-id="${id}-pane"] > div`, touch, -80)
    }

    // Cross a runway's end, then reverse the gesture over the same page track.
    await enter('write', 0.99)
    await scrollFrom('[data-gate-id="write-captions"] [data-scroll-pane]:not([inert])', touch, -100)
    const before = await page.evaluate(() => scrollY)
    if (touch) await swipe(viewport.width / 2, viewport.height / 2, 100)
    else { await page.mouse.move(viewport.width / 2, viewport.height / 2); await page.mouse.wheel(0, -100); await page.waitForTimeout(300) }
    assert(await page.evaluate(() => scrollY) < before, 'Reverse scroll must cross the boundary without getting stuck')
    console.log(`PASS ${viewport.width}x${viewport.height}: editor, captions, analytics, capture, and boundary reversal`)
  }
} finally {
  await browser.close()
}
