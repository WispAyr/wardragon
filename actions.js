// Example actions.js

async function exampleAction(taskId, callback) {
    try {
        // Simulate action execution with a delay
        setTimeout(() => {
            // Success callback
            callback(null, `Task ${taskId} completed successfully.`);
        }, 1000);
    } catch (error) {
        // Error callback
        callback(error, null);
    }
}

// Add more actions here

module.exports = {
    exampleAction, // Export other actions similarly
};
