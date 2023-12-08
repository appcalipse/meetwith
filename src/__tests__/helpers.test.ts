import { isValidUrl } from '@/utils/validations'

describe('test url validator', () => {
  it('URLs should be valid', async () => {
    const url1 = 'https://meeting.com/saasdd'
    const url2 = 'https://meeting.com/saasdd?param1=la#smething=we'
    expect(isValidUrl(url1)).toBeTruthy()
    expect(isValidUrl(url2)).toBeTruthy()
  })

  it('URLs should break', async () => {
    const url1 = 'meeting.com/saasdd'
    const url2 = 'htts://meeting.com/saasdd?param1=la#smething=we'
    const url3 = 'https://meeting/'
    expect(isValidUrl(url1)).toBeFalsy()
    expect(isValidUrl(url2)).toBeFalsy()
    expect(isValidUrl(url3)).toBeFalsy()
  })
})
