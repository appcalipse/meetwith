import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Setup Vertual D.O.M for Tests To Stop Potential Errors
export class ClipboardDataMock {
  getData: jest.Mock<string, [string]>
  setData: jest.Mock<void, [string, string]>

  constructor() {
    this.getData = jest.fn()
    this.setData = jest.fn()
  }
}
export class ClipboardEventMock extends Event {
  clipboardData: ClipboardDataMock

  constructor(type: string, options?: EventInit) {
    super(type, options)
    this.clipboardData = new ClipboardDataMock()
  }
}
export class DataTransferMock {
  data: { [key: string]: string }

  constructor() {
    this.data = {}
  }

  setData(format: string, data: string): void {
    this.data[format] = data
  }

  getData(format: string): string {
    return this.data[format] || ''
  }
}

export class DragEventMock extends Event {
  dataTransfer: DataTransferMock

  constructor(type: string, options?: EventInit) {
    super(type, options)
    this.dataTransfer = new DataTransferMock()
  }
}
import RichTextEditor from '@/components/profile/components/RichTextEditor'
;(global as any).ClipboardEvent = ClipboardEventMock
;(global as any).DragEvent = DragEventMock

function getBoundingClientRect(): DOMRect {
  const rec = {
    x: 0,
    y: 0,
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
  }
  return { ...rec, toJSON: () => rec }
}

class FakeDOMRectList extends Array<DOMRect> implements DOMRectList {
  item(index: number): DOMRect | null {
    return this[index]
  }
}

document.elementFromPoint = (): null => null
HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect
HTMLElement.prototype.getClientRects = (): DOMRectList => new FakeDOMRectList()
Range.prototype.getBoundingClientRect = getBoundingClientRect
Range.prototype.getClientRects = (): DOMRectList => new FakeDOMRectList()
// End Of Setup

test('renders RichTextEditor component', () => {
  const rawComponent = (
    <RichTextEditor value="RichTextEditor Works!" placeholder="Enter Text" />
  )
  const { getByText, getByPlaceholderText } = render(rawComponent)
  const linkElement = getByText('RichTextEditor Works!')
  const placeHolderElement = getByPlaceholderText('Enter Text')
  expect(linkElement).toBeInTheDocument()
  expect(placeHolderElement).toBeInTheDocument()
})
test('RichTextEditor component can update', async () => {
  const rawComponent = (
    <RichTextEditor value="RichTextEditor Works!" placeholder="Enter Text" />
  )
  const { getByText, getByPlaceholderText } = render(rawComponent)
  const linkElement = getByText('RichTextEditor Works!')
  const placeHolderElement = getByPlaceholderText('Enter Text')
  expect(linkElement).toBeInTheDocument()
  expect(placeHolderElement).toBeInTheDocument()
  const editableElement = document.querySelector('.ProseMirror')
  if (!editableElement) return
  fireEvent.click(editableElement!)
  await userEvent.type(editableElement!, 'Test')
  expect(editableElement!.innerHTML).toBe('<p>RichTextEditor Works!Test</p>')
  expect(placeHolderElement).toBeInTheDocument()
})
describe('Test ELements', () => {
  test('renders bold element', async () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="" />
    )
    expect(component).toBeDefined()
    const editableElement = document.querySelector('.ProseMirror')
    const toggleElement = await waitFor(() =>
      component.getByLabelText('Toggle Bold')
    )
    fireEvent.click(toggleElement)
    await userEvent.type(editableElement!, 'RichTextEditor Works!')
    expect(editableElement!.innerHTML).toBe(
      '<p><strong>RichTextEditor Works!</strong></p>'
    )
  })
  test('renders link element', async () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="" />
    )
    expect(component).toBeDefined()
    const editableElement = document.querySelector('.ProseMirror')
    fireEvent.click(component.getByLabelText('Toggle Link'))
    const popOverInput = await waitFor(() => component.getByLabelText('Url'))
    const popOverButton = await waitFor(() => component.getByLabelText('Save'))
    await userEvent.type(popOverInput, 'https://example.com')
    fireEvent.click(popOverButton)

    await userEvent.type(editableElement!, 'RichTextEditor Works!')
  })
  test('renders underline component', async () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="" />
    )
    expect(component).toBeDefined()
    const editableElement = document.querySelector('.ProseMirror')
    fireEvent.click(component.getByLabelText('Toggle Underline'))
    await userEvent.type(editableElement!, 'RichTextEditor Works!')
    expect(editableElement!.innerHTML).toBe(
      '<p><u>RichTextEditor Works!</u></p>'
    )
  })

  test('renders strikethrough component', async () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="" />
    )
    expect(component).toBeDefined()
    const editableElement = document.querySelector('.ProseMirror')
    fireEvent.click(component.getByLabelText('Toggle Strikethrough'))
    await userEvent.type(editableElement!, 'RichTextEditor Works!')
    expect(editableElement!.innerHTML).toBe(
      '<p><s>RichTextEditor Works!</s></p>'
    )
  })

  test('renders italic element', async () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="" />
    )
    expect(component).toBeDefined()
    const editableElement = document.querySelector('.ProseMirror')
    fireEvent.click(component.getByLabelText('Toggle Italics'))
    await userEvent.type(editableElement!, 'RichTextEditor Works!')
  })

  test('renders unordered lists component', () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="RichTextEditor Works!" />
    )
    expect(component).toBeDefined()
    const editableElement = document.querySelector('.ProseMirror')
    fireEvent.click(component.getByLabelText('Toggle Unordered List'))
    expect(editableElement!.innerHTML).toBe(
      '<ul style="margin: 0.5rem"><li><p>RichTextEditor Works!</p></li></ul>'
    )
  })

  test('renders ordered lists component', () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="RichTextEditor Works!" />
    )
    expect(component).toBeDefined()
    const editableElement = document.querySelector('.ProseMirror')
    fireEvent.click(component.getByLabelText('Toggle List'))
    expect(editableElement!.innerHTML).toBe(
      '<ol style="margin: 0.5rem"><li><p>RichTextEditor Works!</p></li></ol>'
    )
  })
})
