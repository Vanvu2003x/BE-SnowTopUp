/**
 * Security Middleware - Block malicious requests
 * Blocks common attack patterns like returnNaN, /lrt, etc.
 */

const blockedPatterns = [
    /returnNaN/i,
    /\/lrt$/i,
    /\/var\/lrt/i,
    /\/etc\/lrt/i,
    /\/dev\/lrt/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /<script/i,
    /javascript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
];

const blockedPaths = [
    '/lrt',
    '/var/lrt',
    '/etc/lrt',
    '/dev/lrt',
    '/.env',
    '/wp-admin',
    '/wp-login',
    '/phpinfo',
    '/.git',
];

function securityBlocker(req, res, next) {
    const fullUrl = req.originalUrl || req.url;
    const body = JSON.stringify(req.body || {});
    const query = JSON.stringify(req.query || {});

    // Check blocked paths
    for (const path of blockedPaths) {
        if (fullUrl.toLowerCase().includes(path.toLowerCase())) {
            console.warn(`[SECURITY] Blocked path attempt: ${req.ip} -> ${fullUrl}`);
            return res.status(403).json({ error: 'Forbidden' });
        }
    }

    // Check blocked patterns in URL, body, query
    const checkString = `${fullUrl} ${body} ${query}`;
    for (const pattern of blockedPatterns) {
        if (pattern.test(checkString)) {
            console.warn(`[SECURITY] Blocked pattern attempt: ${req.ip} -> ${pattern.source} in ${fullUrl}`);
            return res.status(403).json({ error: 'Forbidden' });
        }
    }

    next();
}

module.exports = securityBlocker;
