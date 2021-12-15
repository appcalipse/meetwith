import { Dayjs } from "dayjs";
import { Encrypted } from "eth-crypto";

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
    meetingTypeId: string,
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
    account_pub_key: string,
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
