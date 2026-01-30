/**
 * Vercel KV API Handler
 * Provides REST API for schedule persistence
 * Works with Vercel KV or falls back to in-memory storage
 * 
 * Location: /api/schedule.js
 */

// Try to import Vercel KV
let kv = null;
try {
  kv = require('@vercel/kv');
} catch (e) {
  console.warn('Vercel KV not available, using in-memory storage');
}

// In-memory fallback for development
const memoryStore = new Map();

/**
 * Validate request data
 */
function validateScheduleData(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Data must be an object' };
  }

  if (!Array.isArray(data.events)) {
    return { valid: false, error: 'Events must be an array' };
  }

  // Validate each event
  for (const event of data.events) {
    if (!event.id || !event.type || !event.start || !event.end) {
      return {
        valid: false,
        error: 'Each event must have id, type, start, and end'
      };
    }

    const validTypes = [
      'working_hours',
      'break',
      'lunch',
      'vacation',
      'sick_leave',
      'day_off'
    ];
    if (!validTypes.includes(event.type)) {
      return { valid: false, error: `Invalid event type: ${event.type}` };
    }
  }

  return { valid: true };
}

/**
 * GET /api/schedule?key=<key>
 * Retrieve schedule data
 */
async function handleGet(req, res) {
  const { key } = req.query;

  if (!key) {
    return res.status(400).json({ error: 'key parameter required' });
  }

  try {
    let data;

    // Try Vercel KV first
    if (kv) {
      try {
        data = await kv.get(`schedule:${key}`);
      } catch (kvError) {
        console.warn('KV get failed:', kvError);
        data = memoryStore.get(`schedule:${key}`);
      }
    } else {
      // Use in-memory store
      data = memoryStore.get(`schedule:${key}`);
    }

    if (!data) {
      // Return empty schedule
      return res.status(200).json({
        version: '1.0',
        timezone: 'UTC',
        settings: {
          weekStart: 1,
          defaultWorkStart: 9,
          defaultWorkEnd: 17
        },
        events: [],
        metadata: {
          lastSync: Date.now(),
          lastModified: 0
        }
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('GET error:', error);
    return res.status(500).json({ error: 'Failed to retrieve schedule' });
  }
}

/**
 * POST /api/schedule
 * Save or update schedule data
 * Body: { key: string, data: ScheduleState }
 */
async function handlePost(req, res) {
  const { key, data } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'key required' });
  }

  if (!data) {
    return res.status(400).json({ error: 'data required' });
  }

  // Validate schedule data
  const validation = validateScheduleData(data);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    // Add update metadata
    const enrichedData = {
      ...data,
      metadata: {
        ...data.metadata,
        lastSync: Date.now(),
        lastModified: Date.now(),
        userAgent: req.headers['user-agent']
      }
    };

    // Try Vercel KV first
    if (kv) {
      try {
        // Set with 1-year expiration
        await kv.set(`schedule:${key}`, enrichedData, { ex: 86400 * 365 });
        console.log('✓ Schedule saved to Vercel KV:', key);
      } catch (kvError) {
        console.warn('KV set failed, using memory store:', kvError);
        memoryStore.set(`schedule:${key}`, enrichedData);
      }
    } else {
      // Use in-memory store
      memoryStore.set(`schedule:${key}`, enrichedData);
      console.log('✓ Schedule saved to memory store:', key);
    }

    return res.status(200).json({
      ok: true,
      message: 'Schedule saved',
      key: key,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('POST error:', error);
    return res.status(500).json({ error: 'Failed to save schedule' });
  }
}

/**
 * DELETE /api/schedule
 * Delete schedule data
 * Body: { key: string }
 */
async function handleDelete(req, res) {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'key required' });
  }

  try {
    // Try Vercel KV first
    if (kv) {
      try {
        await kv.del(`schedule:${key}`);
        console.log('✓ Schedule deleted from Vercel KV:', key);
      } catch (kvError) {
        console.warn('KV delete failed, using memory store:', kvError);
        memoryStore.delete(`schedule:${key}`);
      }
    } else {
      // Use in-memory store
      memoryStore.delete(`schedule:${key}`);
      console.log('✓ Schedule deleted from memory store:', key);
    }

    return res.status(200).json({
      ok: true,
      message: 'Schedule deleted',
      key: key
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return res.status(500).json({ error: 'Failed to delete schedule' });
  }
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Rate limiting (simple check)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const rateLimitKey = `ratelimit:${ip}`;

  // Track requests (in production, use Redis)
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const now = Date.now();
  const lastRequest = global.rateLimitStore.get(rateLimitKey);

  if (lastRequest && now - lastRequest < 100) {
    // 100ms rate limit
    return res.status(429).json({ error: 'Too many requests' });
  }

  global.rateLimitStore.set(rateLimitKey, now);

  // Route to handler
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Vercel configuration
 */
export const config = {
  maxDuration: 10
};
