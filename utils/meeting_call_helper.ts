import { v4 as uuidv4 } from 'uuid';
import { ParticipantInfo } from '../types/Meeting';

const generateMeetingUrl = (accounts: ParticipantInfo[]): string => {
    return `https://meet.jit.si/${accounts.map(p => p.account_id.substr(4)).join('-')}${uuidv4()}`;
}

export { generateMeetingUrl }