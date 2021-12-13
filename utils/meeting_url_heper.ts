import { v4 as uuidv4 } from 'uuid';
import { MeetingCreationRequest } from "../types/Meeting";

const generateMeetingUrl = (meeting: MeetingCreationRequest): string => {

    if(!meeting.meeting_url) {
        return `https://meet.jit.si/${meeting.participants.map(p => p.account_identifier.substr(4)).join('-')}${uuidv4()}`;
    }

    return meeting.meeting_url!
}

export { generateMeetingUrl }