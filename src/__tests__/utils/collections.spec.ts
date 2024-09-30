import { diff, intersec } from '@/utils/collections'

describe('collection utils', () => {
  it('should load items from a that doesnt exist on b', async () => {
    // given
    const a = ['d', 'a', 'b', 'c']
    const b = ['a', 'c']

    // when
    const result = diff(a, b)

    // then
    expect(result).toEqual(['d', 'b'])
  })

  it('should find intersection itens between a and b', async () => {
    // given
    const a = ['d', 'a', 'b', 'c']
    const b = ['a', 'c', 'f']

    // when
    const result = intersec(a, b)

    // then
    expect(result).toEqual(['a', 'c'])
  })
})
