import { act, render } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { AutoLoadMore } from './RequestState'

let observers
beforeEach(() => {
  observers = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback, options) {
        this.callback = callback
        this.options = options
        this.disconnect = vi.fn()
        observers.push(this)
      }
      observe(target) {
        this.target = target
      }
    },
  )
})

const intersect = (observer, isIntersecting = true) =>
  act(() => {
    observer.callback([{ target: observer.target, isIntersecting }])
  })

it('loads only on intersection, once per observer, without visible text or a button', () => {
  const load = vi.fn()
  const { container } = render(<AutoLoadMore hasMore onLoadMore={load} label="posts" />)
  expect(container.textContent).toBe('')
  expect(container.querySelector('button')).toBeNull()
  expect(observers[0].options.root).toBeNull()
  intersect(observers[0], false)
  expect(load).not.toHaveBeenCalled()
  intersect(observers[0])
  intersect(observers[0])
  expect(load).toHaveBeenCalledTimes(1)
})

it('uses the nearest scroll pane rather than the document for nested lists', () => {
  const { container } = render(
    <section
      style={{ overflowY: 'auto' }}
      ref={(element) => {
        if (!element) return
        Object.defineProperties(element, {
          clientHeight: { value: 100 },
          scrollHeight: { value: 200 },
        })
      }}
    >
      <div>
        <AutoLoadMore hasMore onLoadMore={vi.fn()} />
      </div>
    </section>,
  )
  expect(observers[0].options.root).toBe(container.querySelector('section'))
})

it('uses the viewport for document overflow and unconstrained wrappers', () => {
  document.body.style.overflowY = 'auto'
  render(
    <section style={{ overflowY: 'auto' }}>
      <AutoLoadMore hasMore onLoadMore={vi.fn()} />
    </section>,
  )
  expect(observers[0].options.root).toBeNull()
  document.body.style.overflowY = ''
})

it('blocks loading, failed and exhausted lists and re-arms after a completed page', () => {
  const load = vi.fn()
  const { rerender } = render(<AutoLoadMore hasMore loading onLoadMore={load} />)
  expect(observers).toHaveLength(0)
  rerender(<AutoLoadMore hasMore onLoadMore={load} />)
  intersect(observers[0])
  rerender(<AutoLoadMore hasMore loading onLoadMore={load} />)
  expect(observers[0].disconnect).toHaveBeenCalled()
  intersect(observers[0])
  expect(load).toHaveBeenCalledTimes(1)
  rerender(<AutoLoadMore hasMore error onLoadMore={load} />)
  expect(observers).toHaveLength(1)
  rerender(<AutoLoadMore hasMore onLoadMore={load} />)
  intersect(observers[1])
  expect(load).toHaveBeenCalledTimes(2)
  rerender(<AutoLoadMore hasMore={false} onLoadMore={load} />)
  intersect(observers[1])
  expect(load).toHaveBeenCalledTimes(2)
})

it('ignores callbacks after unmount or a filter callback change', () => {
  const first = vi.fn()
  const second = vi.fn()
  const { rerender, unmount } = render(<AutoLoadMore hasMore onLoadMore={first} />)
  rerender(<AutoLoadMore hasMore onLoadMore={second} />)
  intersect(observers[0])
  expect(first).not.toHaveBeenCalled()
  intersect(observers[1])
  expect(second).toHaveBeenCalledTimes(1)
  unmount()
  intersect(observers[1])
  expect(second).toHaveBeenCalledTimes(1)
})
