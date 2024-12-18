// This file implements a logging mechanism to display messages and errors in the UI.

class Logger {
    constructor(logContainer) {
        this.logContainer = logContainer;
    }

    log(message) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = message;
        this.logContainer.appendChild(logEntry);
    }

    error(message) {
        const errorEntry = document.createElement('div');
        errorEntry.className = 'log-entry error';
        errorEntry.textContent = `Error: ${message}`;
        this.logContainer.appendChild(errorEntry);
    }

    clear() {
        this.logContainer.innerHTML = '';
    }
}

// Usage example
const logContainer = document.getElementById('log-container');
const logger = new Logger(logContainer);

// Export the logger instance for use in other modules
export default logger;