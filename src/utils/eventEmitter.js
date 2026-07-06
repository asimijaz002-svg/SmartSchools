const EventEmitter = require('events');

// Create a single shared event emitter instance
const eventEmitter = new EventEmitter();

module.exports = eventEmitter;