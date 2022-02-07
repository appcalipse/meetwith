import { AccountSession } from '../../types/Session'

declare module 'iron-session' {
  interface IronSessionData {
    account?: AccountSession
  }
}
