import { Encrypted } from "eth-crypto";
import { User } from "./User";

export interface DBMetting {
    _id: string,
    source: string,
    target: string,
    startTime: number,
    endTime: number,
    content?: Encrypted
}

export interface Metting {
    source: User,
    target: User,
    startTime: Date,
    endTime: Date,
    content: string
}