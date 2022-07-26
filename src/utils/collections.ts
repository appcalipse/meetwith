export const diff = (a: string[], b: string[]) => {
  return a.filter(it => !b.includes(it))
}

export const intersec = (a: string[], b: string[]) => {
  return a.filter(it => b.includes(it))
}
