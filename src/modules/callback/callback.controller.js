const OrderService = require("../order/order.service");
const { db } = require("../../configs/drizzle");
const { orders } = require("../../db/schema");
const { eq } = require("drizzle-orm");
const crypto = require("crypto");

/**
 * Get real client IP from Cloudflare or proxy headers
 */
const getClientIP = (req) => {
    return req.headers['cf-connecting-ip'] ||
        req.headers['x-real-ip'] ||
        (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
        req.ip;
};

/**
 * Verify callback signature using HMAC-SHA256
 * Signature should be in X-Callback-Signature header
 */
const verifyCallbackSignature = (req, secret) => {
    const signature = req.headers['x-callback-signature'];
    if (!signature) return false;

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
};

const CallbackController = {
    // Morishop Callback
    // Method: POST
    // Params: idtrx (our ID), status (Success/Error), sn (serial/note), price (actual price)
    morishopCallback: async (req, res) => {
        try {
            const clientIP = getClientIP(req);

            // Security: Verify request source
            // Option 1: Check signature if provided
            const callbackSecret = process.env.CALLBACK_SECRET;
            if (callbackSecret) {
                const isValid = verifyCallbackSignature(req, callbackSecret);
                if (!isValid) {
                    console.warn("[Callback] Morishop: Invalid signature from IP:", clientIP);
                    return res.status(403).json({ status: false, msg: "Invalid signature" });
                }
            }

            // Option 2: Check order exists and is in valid state (prevents random ID guessing)
            const { idtrx, status, sn, price, note } = req.body;

            // idtrx format expected: "KB_123" -> order.id = 123
            if (!idtrx || !idtrx.toString().startsWith('KB_')) {
                return res.json({ status: false, msg: "Invalid ID format" });
            }

            const orderId = idtrx.split('_')[1];

            // Verify order exists and is in processing state
            const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
            if (!order) {
                console.warn("[Callback] Morishop: Order not found:", orderId);
                return res.json({ status: false, msg: "Order not found" });
            }

            // Only allow status change from 'processing' state
            if (order.status !== 'processing' && order.status !== 'pending') {
                console.warn("[Callback] Morishop: Order already finalized:", orderId, "Status:", order.status);
                return res.json({ status: true, msg: "Order already processed" });
            }

            // Map status
            // Morishop status: 'Success', 'Error', 'Pending'
            let newStatus = 'processing';
            let description = sn || note || '';

            if (status === 'Success') {
                newStatus = 'success';
            } else if (status === 'Error' || status === 'Gagal') { // 'Gagal' is failed in Indo
                newStatus = 'failed'; // or 'cancelled'
            }

            if (newStatus === 'processing') {
                return res.json({ status: true }); // No change
            }

            // Update Order
            if (newStatus === 'success') {
                await OrderService.completeOrder(orderId);
            } else if (newStatus === 'failed') {
                // Auto refund if failed
                await OrderService.cancelOrderAndRefund(orderId);
            }

            res.json({ status: true });
        } catch (error) {
            console.error("[Callback] Morishop Error:", error);
            res.status(500).json({ status: false, msg: error.message });
        }
    },

    // NapGame247 Callback (If available/configured)
    napgameCallback: async (req, res) => {
        try {
            const clientIP = getClientIP(req);

            // Verify signature if secret is configured
            const callbackSecret = process.env.CALLBACK_SECRET;
            if (callbackSecret && req.method === 'POST') {
                const isValid = verifyCallbackSignature(req, callbackSecret);
                if (!isValid) {
                    console.warn("[Callback] NapGame247: Invalid signature from IP:", clientIP);
                    return res.status(403).send("Forbidden");
                }
            }

            // Logic depends on NapGame callback docs.
            // Placeholder for now - implement based on actual API docs
            res.send("OK");
        } catch (error) {
            console.error("[Callback] NapGame247 Error:", error);
            res.status(500).send("Error");
        }
    }
};

module.exports = CallbackController;

