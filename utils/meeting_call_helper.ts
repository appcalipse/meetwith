import { v4 as uuidv4 } from 'uuid';

const generateMeetingUrl = (): string => {
    return `https://app.huddle01.com/room?roomId=${uuidv4()}`;
}

export { generateMeetingUrl }