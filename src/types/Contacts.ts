interface LeanAccount {
  name: string
  address: string
  avatar_url?: string
  email?: string
}
export interface ContactSearch {
  total_count: number
  result?: Array<LeanAccount> | null
}

export interface InviteContact {
  address?: string
  email?: string
}
