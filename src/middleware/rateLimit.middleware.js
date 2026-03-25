const rateLimit = require('express-rate-limit');

/**
 * Get real client IP from Cloudflare or proxy headers
 * Priority: cf-connecting-ip > x-real-ip > x-forwarded-for > req.ip
 */
const getClientIP = (req) => {
    return req.headers['cf-connecting-ip'] ||
        req.headers['x-real-ip'] ||
        (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
        req.ip;
};

// General API limiter - 2000 requests per 15 minutes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000,
    message: {
        status: false,
        message: "Quá nhiều request, vui lòng thử lại sau 15 phút"
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIP,
    validate: false, // Disable IPv6 validation - Cloudflare handles this
});

// Auth limiter - 5 login attempts per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        status: false,
        message: "Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 15 phút"
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: getClientIP,
    validate: false,
});

// OTP limiter - 3 OTP requests per 5 minutes (prevent spam)
const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3,
    message: {
        status: false,
        message: "Quá nhiều yêu cầu gửi OTP, vui lòng thử lại sau 5 phút"
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIP,
    validate: false,
});

// Order creation limiter - 10 orders per minute
const orderLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: {
        status: false,
        message: "Quá nhiều đơn hàng, vui lòng chờ 1 phút"
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIP,
    validate: false,
});

// Callback limiter - 100 requests per minute (for webhooks)
const callbackLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: {
        status: false,
        message: "Too many callback requests"
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getClientIP,
    validate: false,
});

module.exports = {
    generalLimiter,
    authLimiter,
    otpLimiter,
    orderLimiter,
    callbackLimiter,
    getClientIP
};
