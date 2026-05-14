/**
 * Rate limiter middleware — 20 AI calls per hour per authenticated user.
 * In-memory store (resets on server restart).
 */

const store = new Map(); // key: userId, value: { count, resetAt }

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 20;

function aiRateLimiter(req, res, next) {
  const userId = req.user && (req.user.id || req.user.userId);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const now = Date.now();
  const record = store.get(userId);

  if (!record || now > record.resetAt) {
    store.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((record.resetAt - now) / 1000);
    res.set('Retry-After', retryAfterSec);
    return res.status(429).json({
      error: `AI rate limit exceeded. You may make ${MAX_REQUESTS} AI requests per hour. Try again in ${retryAfterSec} seconds.`,
      retryAfter: retryAfterSec,
    });
  }

  record.count += 1;
  return next();
}

module.exports = { aiRateLimiter };
