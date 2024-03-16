import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
jest.setTimeout(30000)
// Setup Virtual D.O.M for Tests To Stop Potential Errors
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
function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time))
}
describe('Rich Text Editor', () => {
  beforeEach(() => {
    // Ignoring act warnings in this instance because of a testing-library bug:
    // https://github.com/testing-library/react-testing-library/issues/1216
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
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
    cleanup()
  })
  test('renders bold element', async () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="" />
    )
    expect(component).toBeDefined()
    const editableElement = document!
      .querySelector('.ProseMirror')!
      .querySelector('p')
    const toggleElement = await waitFor(() =>
      component.getByLabelText('Toggle Bold')
    )
    fireEvent.click(toggleElement)
    fireEvent.change(editableElement!, {
      target: { textContent: 'RichTextEditor Works!' },
    })
    await delay(500)
    expect(editableElement!.innerHTML).toBe(
      '<strong>RichTextEditor Works!</strong>'
    )
    cleanup()
  })
  test('renders link element', async () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="" />
    )
    expect(component).toBeDefined()
    const editableElement = document!
      .querySelector('.ProseMirror')!
      .querySelector('p')
    fireEvent.click(component.getByLabelText('Toggle Link'))
    const popOverInput = await waitFor(() =>
      component.getByLabelText('url-input')
    )
    const popOverButton = await waitFor(() =>
      component.getByLabelText('save-url')
    )

    await userEvent.type(popOverInput, 'https://example.com')
    fireEvent.click(popOverButton)

    await delay(500)
    fireEvent.change(editableElement!, {
      target: { textContent: 'RichTextEditor Works!' },
    })

    await delay(500)
    expect(editableElement!.innerHTML).toBe(
      '<a target="_blank" rel="noopener noreferrer nofollow" style="text-decoration: underline; color: #F46739;" href="https://example.com">RichTextEditor Works!</a>'
    )
    cleanup()
  })
  test('renders underline component', async () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="" />
    )
    expect(component).toBeDefined()
    const editableElement = document!
      .querySelector('.ProseMirror')!
      .querySelector('p')
    await userEvent.click(component.getByLabelText('Toggle Underline'))
    fireEvent.change(editableElement!, {
      target: { textContent: 'RichTextEditor Works!' },
    })
    await delay(500)
    expect(editableElement!.innerHTML).toBe('<u>RichTextEditor Works!</u>')
    cleanup()
  })

  test('renders strikethrough component', async () => {
    const promise = Promise.resolve()
    const onValueChange = jest.fn(() => promise)
    const component = render(
      <RichTextEditor
        placeholder="Enter Text"
        value=""
        onValueChange={onValueChange}
      />
    )
    expect(component).toBeDefined()
    const editableElement = document!
      .querySelector('.ProseMirror')!
      .querySelector('p')
    fireEvent.click(component.getByLabelText('Toggle Strikethrough'))
    fireEvent.change(editableElement!, {
      target: { textContent: 'RichTextEditor Works!' },
    })
    await delay(500)
    expect(editableElement!.innerHTML).toBe('<s>RichTextEditor Works!</s>')
  })

  test('renders italic element', async () => {
    const promise = Promise.resolve()
    const onValueChange = jest.fn(() => promise)
    const component = render(
      <RichTextEditor
        placeholder="Enter Text"
        value=""
        onValueChange={onValueChange}
      />
    )
    expect(component).toBeDefined()
    const editableElement = document!
      .querySelector('.ProseMirror')!
      .querySelector('p')
    fireEvent.click(component.getByLabelText('Toggle Italics'))
    fireEvent.change(editableElement!, {
      target: { textContent: 'RichTextEditor Works!' },
    })
    await delay(500)
    expect(editableElement!.innerHTML).toBe('<em>RichTextEditor Works!</em>')
  })

  test('renders unordered lists component', async () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="RichTextEditor Works!" />
    )
    expect(component).toBeDefined()
    const editableElement = document.querySelector('.ProseMirror')
    fireEvent.click(component.getByLabelText('Toggle Unordered List'))
    await delay(500)
    expect(editableElement!.innerHTML).toBe(
      '<ul style="margin: 0.5rem 1.5rem"><li><p>RichTextEditor Works!</p></li></ul>'
    )
    cleanup()
  })

  test('renders ordered lists component', async () => {
    const component = render(
      <RichTextEditor placeholder="Enter Text" value="RichTextEditor Works!" />
    )
    expect(component).toBeDefined()
    const editableElement = document.querySelector('.ProseMirror')
    fireEvent.click(component.getByLabelText('Toggle List'))
    await delay(500)
    expect(editableElement!.innerHTML).toBe(
      '<ol style="margin: 0.5rem 1.5rem"><li><p>RichTextEditor Works!</p></li></ol>'
    )
  })
})
