import { afterEach, describe, expect, it } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'

import { EditableMarkdown } from '@/components/atoms/EditableMarkdown'

afterEach(() => {
  cleanup()
})

describe('EditableMarkdown', () => {
  it('renders a textarea with default styling', () => {
    render(<EditableMarkdown />)

    const textarea = screen.getByRole('textbox')
    expect(textarea.tagName.toLowerCase()).toBe('textarea')
    expect(textarea.className).toContain('min-h-[160px]')
    expect(textarea.className).toContain('w-full')
    expect(textarea.className).toContain('rounded-xl')
    expect(textarea.className).toContain('font-mono')
    expect(textarea.className).toContain('text-sm')
  })

  it('forwards ref and allows imperative focus', () => {
    const ref = React.createRef<HTMLTextAreaElement>()
    render(<EditableMarkdown ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
    ref.current?.focus()
    expect(document.activeElement).toBe(ref.current)
  })

  it('defaults spellCheck to false', () => {
    render(<EditableMarkdown />)
    const textarea = screen.getByRole('textbox')
    expect(textarea.getAttribute('spellcheck')).toBe('false')
  })

  it('allows overriding spellCheck', () => {
    render(<EditableMarkdown spellCheck />)
    const textarea = screen.getByRole('textbox')
    expect(textarea.getAttribute('spellcheck')).toBe('true')
  })

  it('applies error styling when hasError is true', () => {
    render(<EditableMarkdown hasError />)
    const textarea = screen.getByRole('textbox')
    expect(textarea.className).toContain('border-destructive')
    expect(textarea.className).toContain('focus:ring-destructive')
  })

  it('applies normal border styling when hasError is false', () => {
    render(<EditableMarkdown hasError={false} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea.className).toContain('border-border')
  })

  it('forwards value and onChange props', () => {
    let latestValue = ''
    render(
      <EditableMarkdown
        value="hello world"
        onChange={(e) => {
          latestValue = e.target.value
        }}
      />,
    )

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('hello world')

    fireEvent.change(textarea, { target: { value: 'updated' } })
    expect(latestValue).toBe('updated')
  })

  it('forwards aria-label and placeholder', () => {
    render(
      <EditableMarkdown
        aria-label="Edit widget markdown"
        placeholder="Enter JSON config"
      />,
    )

    const textarea = screen.getByRole('textbox')
    expect(textarea.getAttribute('aria-label')).toBe('Edit widget markdown')
    expect(textarea.getAttribute('placeholder')).toBe('Enter JSON config')
  })

  it('merges custom className with base classes', () => {
    render(<EditableMarkdown className="my-custom-class" />)
    const textarea = screen.getByRole('textbox')
    expect(textarea.className).toContain('my-custom-class')
    expect(textarea.className).toContain('min-h-[160px]')
  })

  it('has the correct displayName', () => {
    expect(EditableMarkdown.displayName).toBe('EditableMarkdown')
  })
})
