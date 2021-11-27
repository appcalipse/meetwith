import { Dayjs } from "dayjs";
import { Encrypted } from "eth-crypto";
import { Account } from "./Account";

export enum MeetingStatus {
    Pending = "pending",
    Accepted = "accepted",
    Rejected = "rejected",
}

export enum ParticipantType {
    Scheduler = "scheduler",
    Owner = "owner",
    Invitee = "invitee",
}

export interface MeetingCreationRequest extends DBMeeting {
    participants: ParticipantInfo[],
    content?: string
}

export interface DBMeeting {
    id?: string,
    created_at?: Date,
    start: Date,
    end: Date,
}

export interface DBParticipantInfo {
    id?: string,
    meeting_id?: string,
    participant: string,
    meeting_info_path?: string
}

export interface ParticipantInfo extends DBParticipantInfo {
    type: ParticipantType,
    status: MeetingStatus,
}

export interface IPFSMeetingInfo {
    created_at: Date,
    status: MeetingStatus,
    type: ParticipantType,
    content?: Encrypted,
    change_history_paths: string[]
}

export interface Participant {
    address: string,
    type: ParticipantType,
    status: MeetingStatus,
}

export interface MeetingEncrypted {
    id: string,
    participants: Participant[],
    startTime: Dayjs,
    endTime: Dayjs,
    content?: Encrypted
}