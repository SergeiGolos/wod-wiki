// Run from apps/playground: bun --preload ./tests/unit-setup.ts tests/note-context-nav.check.tsx
import assert from 'node:assert/strict'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { NavProvider } from '../app/nav/NavContext'
import { NavSidebar } from '../app/nav/NavSidebar'
import type { NavItem } from '../app/nav/navTypes'
import { NoteContextNav, type NoteContextData } from '../app/pages/shared/noteContextLinks'

const tree: NavItem[] = [{
  id: 'collections',
  label: 'Collections',
  action: { type: 'route', to: '/collections' },
  isActive: () => true,
  panel: () => <div>Listing filters</div>,
}]
const parent = { id: 'mark-wildman', title: 'mark-wildman', to: '/c/mark-wildman' }
const otherParent = { id: 'dan-john', title: 'dan-john', to: '/c/dan-john' }
const empty: NoteContextData = { efforts: [], backlinks: [], related: [] }
const linked: NoteContextData = {
  efforts: [{ id: 'press', title: 'Press', to: '/e/press' }],
  backlinks: [{ id: 'copy', title: 'Journal copy', to: '/notes/copy' }],
  related: [{ id: 'related', title: 'Related workout', to: '/notes/related' }],
}

function NotePage({ data }: { data: NoteContextData }) {
  const location = useLocation()
  const navigate = useNavigate()
  return <>
    <output data-testid="route">{location.pathname}</output>
    <button onClick={() => navigate('/notes/other')}>Open another note</button>
    <button onClick={() => navigate('/collections')}>Open listing</button>
    <button onClick={() => navigate('/notes/orphan')}>Open orphan</button>
    <NavSidebar navSpec={[{ kind: 'link', id: 'route-menu', label: 'Listing menu', to: '/collections' }]} />
    {location.pathname.startsWith('/notes/') && location.pathname !== '/notes/copy' && (
      <NoteContextNav
        data={location.pathname === '/notes/source' ? data : empty}
        up={location.pathname === '/notes/orphan' ? null : location.pathname === '/notes/source' ? parent : otherParent}
        source={location.pathname === '/notes/source' ? { id: 'origin', title: 'Origin note', to: '/notes/origin' } : null}
      />
    )}
  </>
}

function Scenario({ data }: { data: NoteContextData }) {
  return <MemoryRouter initialEntries={['/unrelated', '/notes/source']}>
    <NavProvider tree={tree}><NotePage data={data} /></NavProvider>
  </MemoryRouter>
}

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const container = document.createElement('div')
document.body.append(container)
const root = createRoot(container)
const button = (name: string) => Array.from(container.querySelectorAll('button')).find(el => el.textContent === name)
const click = async (name: string) => {
  const target = button(name)
  assert.ok(target, `Missing button: ${name}`)
  await act(() => target.click())
}

try {
  await act(() => root.render(<Scenario data={empty} />))
  assert.ok(button('mark-wildman'))
  assert.ok(!container.textContent?.includes('Listing filters'))
  assert.ok(!button('Listing menu'))

  await act(() => root.render(<Scenario data={linked} />))
  assert.ok(button('Journal copy'))
  assert.ok(button('Press'))
  assert.ok(button('Related workout'))

  await click('Open another note')
  assert.ok(button('dan-john'))
  assert.ok(!button('mark-wildman'))
  assert.ok(!button('Journal copy'))

  await click('Open orphan')
  assert.ok(!container.textContent?.includes('Listing filters'))
  assert.ok(!button('Listing menu'))
  assert.ok(!button('dan-john'))
  assert.ok(!button('Origin note'))

  await click('Open listing')
  assert.ok(container.textContent?.includes('Listing filters'))
  assert.ok(button('Listing menu'))
  assert.ok(!button('dan-john'))

  await act(() => root.render(<Scenario key="backlink" data={linked} />))
  await click('Journal copy')
  assert.equal(container.querySelector('output')?.textContent, '/notes/copy')
  assert.ok(!button('mark-wildman'))

  await act(() => root.render(<Scenario key="source" data={empty} />))
  await click('Origin note')
  assert.equal(container.querySelector('output')?.textContent, '/notes/origin')

  await act(() => root.render(<Scenario key="parent" data={empty} />))
  await click('mark-wildman')
  assert.equal(container.querySelector('output')?.textContent, '/c/mark-wildman')
  console.log('Note L2 check passed: replacement, relationship updates, route cleanup, canonical links.')
} finally {
  await act(() => root.unmount())
  container.remove()
}
