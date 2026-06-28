const rateLimit = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: 60000,
  max: 20,
  message: { error: 'Chat rate limit exceeded. Please wait before sending more messages.' }
});

const searchLimiter = rateLimit({
  windowMs: 60000,
  max: 30,
  message: { error: 'Search rate limit exceeded. Please wait before searching again.' }
});

const uploadLimiter = rateLimit({
  windowMs: 60000,
  max: 5,
  message: { error: 'Upload rate limit exceeded. Please wait before uploading again.' }
});

module.exports = { chatLimiter, searchLimiter, uploadLimiter };
