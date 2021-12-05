import { Dayjs } from "dayjs";
import { Encrypted } from "eth-crypto";
import { Account } from "./Account";

export enum ParticipationStatus {
    Pending = "pending",
    Accepted = "accepted",
    Rejected = "rejected",
}

export enum ParticipantType {
    Scheduler = "scheduler",
    Owner = "owner",
    Invitee = "invitee",
}

export interface MeetingCreationRequest {
    participants: ParticipantBaseInfo[],
    content?: string,
    start: Date,
    end: Date,
    meeting_url?: string
}

export interface DBSlot {
    id?: string,
    created_at?: Date,
    start: Date,
    end: Date,
    account: string,
    meeting_info_file_path: string
}

export interface DBSlotEnhanced extends DBSlot {
    meeting_info_encrypted: Encrypted
}

export interface ParticipantBaseInfo {
    account_identifier: string,
    type: ParticipantType,
}

export interface ParticipantInfo extends ParticipantBaseInfo {
    status: ParticipationStatus,
    slot_id: string,
}

export interface IPFSMeetingInfo {
    created_at: Date,
    content?: string,
    meeting_url: string,
    participants: ParticipantInfo[],   
    change_history_paths: string[]
}

export interface MeetingDecrypted {
    created_at?: Date,
    start: Dayjs,
    end: Dayjs,
    participants: ParticipantInfo[],
    meeting_url: string,
    content?: string

}
// export interface DBMeeting {
//     id?: string,
//     created_at?: Date,
//     start: Date,
//     end: Date,
// }

// export interface DBParticipantInfo {
//     id?: string,
//     meeting_id?: string,
//     participant: string,
//     meeting_info_path?: string
// }

// export interface ParticipantInfo extends DBParticipantInfo {
//     type: ParticipantType,
//     status: MeetingStatus,
// }

// export interface Participant {
//     address: string,
//     type: ParticipantType,
//     status: MeetingStatus,
// }

// export interface MeetingEncrypted {
//     id: string,
//     participants: Participant[],
//     startTime: Dayjs,
//     endTime: Dayjs,
//     content?: Encrypted
// }