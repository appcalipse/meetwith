export class TimeNotAvailableError extends Error {
    constructor() {
        super("The selected slot is not available.");
        this.name = "TimeNotAvailableError";
    }
}

export class AccountNotFoundError extends Error {
    constructor(identifier: string) {
        super(`Account with identifier ${identifier} not found.`);
        this.name = "AccountNotFoundError";
    }
}

export class MeetingNotFoundError extends Error {
    constructor(identifier: string) {
        super(`Meeting slot with identifier ${identifier} not found.`);
        this.name = "MeetingNotFoundError";
    }
}