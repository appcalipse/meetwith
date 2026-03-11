const useSWR = jest.fn(() => ({ data: undefined, error: undefined, isLoading: false, mutate: jest.fn() }))
module.exports = useSWR
module.exports.default = useSWR
