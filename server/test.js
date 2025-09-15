console.log('Hello from test.js!');
try {
    require('express');
    console.log('Express module loaded successfully.');
} catch (e) {
    console.error('Failed to load Express:', e.message);
}