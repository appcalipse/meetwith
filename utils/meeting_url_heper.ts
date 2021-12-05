import { randomUUID } from "crypto";
import { MeetingCreationRequest } from "../types/Meeting";

const generateMeetingUrl = (meeting: MeetingCreationRequest): string => {

    if(!meeting.meeting_url) {
        return `https://meet.jit.si/${meeting.participants.map(p => p.account_identifier.substr(4)).join('-')}${randomUUID()}`;
    }

    return meeting.meeting_url!
}

export { generateMeetingUrl }