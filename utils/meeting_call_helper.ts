import { v4 as uuidv4 } from 'uuid';

const generateMeetingUrl = (): string => {
    return `https://meet.jit.si/${uuidv4()}`;
}

export { generateMeetingUrl }