const NguonAService = require("./nguona.service");
const OrderService = require("../order/order.service");
const { db } = require("../../configs/drizzle");
const { orders } = require("../../db/schema");
const { eq } = require("drizzle-orm");

const NguonAController = {
    // Webhook for Order Status Update
    handleCallback: async (req, res) => {
        try {
            const { event, order_id, status, amount, message, reason } = req.body;


            // NguonA sends 'order_id' which is what WE sent them (our order ID)
            // or 'id' if they return their ID. 
            // Docs say: 
            // { event: "order.success", order_id: 12345 ... }
            // where order_id is the ID we received when creating order (their ID) OR our ID?
            // "order": { "id": 12345 ... } in create response.
            // "created_at": "..."

            // Wait, in `createOrder` service validation: 
            // `data: { id: res.order.id }` -> this is saving EXTERNAL ID to `api_id`.

            // If the webhook sends User's ID (our ID) or their ID?
            // Usually webhooks send the ID of the order in THEIR system, or a ref_id we sent.
            // The docs say: `order_id: 12345` in callback. 
            // In create response: `order: { id: 12345 }`.
            // So `order_id` in callback likely matches `api_id` in our DB.

            if (!order_id) return res.status(400).json({ status: false, message: "Missing order_id" });

            // Find order by API ID (External ID)
            const [order] = await db.select().from(orders).where(eq(orders.api_id, order_id));

            if (!order) {
                console.error(`[NguonA] Webhook: Order with api_id ${order_id} not found.`);
                return res.status(404).json({ status: false, message: "Order not found" });
            }

            // Map status
            let newStatus = 'processing';
            if (status === 'success') newStatus = 'success';
            if (status === 'cancelled' || status === 'failed') newStatus = 'failed'; // or 'cancelled'

            if (newStatus === 'success' && order.status !== 'success') {
                await OrderService.completeOrder(order.id);
            } else if (newStatus === 'failed' && order.status !== 'failed' && order.status !== 'cancelled') {
                // If failed/cancelled, we should refund?
                // OrderService.cancelOrderAndRefund(order.id);
                // Using reason from webhook
                await OrderService.cancelOrderAndRefund(order.id);
            }

            return res.status(200).json({ status: true, message: "Callback processed" });

        } catch (error) {
            console.error("[NguonA] Callback Error:", error);
            return res.status(500).json({ status: false, message: "Internal Server Error" });
        }
    }
};

module.exports = NguonAController;
