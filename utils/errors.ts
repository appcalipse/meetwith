export class TimeNotAvailableError extends Error {
    constructor() {
        super("The selected slot is not available.");
        this.name = "TimeNotAvailableError";
    }
}

export class UserNotFoundError extends Error {
    constructor(identifier: string) {
        super(`User with identifier ${identifier} not found.`);
        this.name = "UserNotFoundError";
    }
}