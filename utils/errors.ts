class TimeNotAvailableError extends Error {
    constructor() {
        super("The selected slot is not available.");
        this.name = "TimeNotAvailableError";
    }
}