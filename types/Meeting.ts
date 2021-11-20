import { Dayjs } from "dayjs";
import { Encrypted } from "eth-crypto";
import { Account } from "./Account";

export interface DBMeeting {
    _id: string,
    source: string,
    target: string,
    startTime: number,
    endTime: number,
    content?: Encrypted
}

export interface Meeting {
    source: Account,
    target: Account,
    startTime: Dayjs,
    endTime: Dayjs,
    content: string
}