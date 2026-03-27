const { db } = require("../../configs/drizzle");
const { orders, users, topupPackages, games, balanceHistory } = require("../../db/schema");
const { eq, like, or, and, sql, desc, aliasedTable, inArray, isNotNull } = require("drizzle-orm");

const UserService = require("../user/user.service");
const { sendOrderSuccessEmail, sendOrderFailureEmail } = require("../../services/nodemailer.service");
const { emitToUser } = require("../../sockets/websocket");

const buildOrderQuery = () => {
    const usersNap = aliasedTable(users, "user_nap");

    return {
        selection: {
            id: orders.id,
            user_id: orders.user_id,
            user_email: users.email,
            user_name: users.name,
            user_nap_email: usersNap.email,
            user_nap_name: usersNap.name,
            status: orders.status,
            account_info: orders.account_info,
            amount: orders.amount,
            update_at: orders.updated_at,
            create_at: orders.created_at,
            package_name: topupPackages.package_name,
            thumbnail: topupPackages.thumbnail,
            package_type: topupPackages.package_type,
            game_name: games.name,
            game_image: games.thumbnail,
            profit: orders.profit,
        },
        from: orders,
        joins: (queryBuilder) =>
            queryBuilder
                .innerJoin(users, eq(orders.user_id, users.id))
                .leftJoin(usersNap, eq(orders.user_id_nap, usersNap.id))
                .leftJoin(topupPackages, eq(orders.package_id, topupPackages.id))
                .leftJoin(games, eq(topupPackages.game_id, games.id)),
    };
};

const pickFirstValue = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

const parseAccountInfo = (payload) => {
    if (!payload) {
        return {};
    }

    if (typeof payload === "string") {
        try {
            return JSON.parse(payload);
        } catch (error) {
            console.error("[OrderService] Failed to parse account_info JSON:", error);
            return {};
        }
    }

    return payload;
};

const isPartnerSource = (apiSource) => ["partner", "nguona"].includes(String(apiSource || "").toLowerCase());

const assertAdminActor = (actor) => {
    if (!actor || actor.role !== "admin") {
        throw { status: 403, message: "Khong du quyen han" };
    }
};

const mapExternalStatus = (status) => {
    const normalized = String(status || "").trim().toUpperCase();

    if (normalized === "COMPLETED") return "success";
    if (normalized === "FAILED") return "cancelled";
    if (normalized === "PARTIAL") return "partial";
    if (normalized === "PENDING" || normalized === "PROCESSING") return "processing";

    return "processing";
};

const buildPartnerGameAccountInfo = (game, accountInfo = {}) => {
    const normalizedAccountInfo = parseAccountInfo(accountInfo);
    const fields = Array.isArray(game?.input_fields) ? game.input_fields : [];
    const resolvedData = {};

    const aliases = {
        uid: pickFirstValue(
            normalizedAccountInfo.uid,
            normalizedAccountInfo.id,
            normalizedAccountInfo.openid,
            normalizedAccountInfo.playerId,
            normalizedAccountInfo.player_id
        ),
        username: pickFirstValue(normalizedAccountInfo.username, normalizedAccountInfo.account),
        password: pickFirstValue(normalizedAccountInfo.password, normalizedAccountInfo.pass),
        server: pickFirstValue(
            normalizedAccountInfo.server,
            normalizedAccountInfo.serverId,
            normalizedAccountInfo.server_id,
            normalizedAccountInfo.idServer
        ),
        id_server: pickFirstValue(
            normalizedAccountInfo.idServer,
            normalizedAccountInfo.id_server,
            normalizedAccountInfo.serverId,
            normalizedAccountInfo.server
        ),
        phone: pickFirstValue(
            normalizedAccountInfo.phone,
            normalizedAccountInfo.sdt,
            normalizedAccountInfo.sdrt,
            normalizedAccountInfo.zalo,
            normalizedAccountInfo.zaloNumber
        ),
        note: normalizedAccountInfo.note,
    };

    for (const field of fields) {
        const fieldName = String(field?.name || "").trim();
        if (!fieldName) {
            continue;
        }

        const lowerFieldName = fieldName.toLowerCase();
        const directValue = pickFirstValue(normalizedAccountInfo[fieldName], normalizedAccountInfo[lowerFieldName]);

        let mappedValue = directValue;
        if (mappedValue === undefined) {
            if (["uid", "id", "openid", "player_id", "playerid"].includes(lowerFieldName)) {
                mappedValue = aliases.uid;
            } else if (["username", "account"].includes(lowerFieldName)) {
                mappedValue = aliases.username;
            } else if (["password", "pass"].includes(lowerFieldName)) {
                mappedValue = aliases.password;
            } else if (["server", "server_id", "serverid"].includes(lowerFieldName)) {
                mappedValue = aliases.server;
            } else if (["id_server", "zone_id", "zoneid", "role_id"].includes(lowerFieldName)) {
                mappedValue = aliases.id_server;
            } else if (["phone", "sdt", "zalo", "zalo_number"].includes(lowerFieldName)) {
                mappedValue = aliases.phone;
            } else if (lowerFieldName === "note") {
                mappedValue = aliases.note;
            }
        }

        if (mappedValue !== undefined && mappedValue !== null && mappedValue !== "") {
            resolvedData[fieldName] = mappedValue;
        }
    }

    if (Object.keys(resolvedData).length > 0) {
        return resolvedData;
    }

    return Object.entries({
        uid: aliases.uid,
        username: aliases.username,
        password: aliases.password,
        server: aliases.server,
        id_server: aliases.id_server,
        phone: aliases.phone,
        note: aliases.note,
    }).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            acc[key] = value;
        }
        return acc;
    }, {});
};

const OrderService = {
    createOrder: async (data) => {
        let createdOrder = null;
        const qty = Number(data.quantity) > 0 ? Number(data.quantity) : 1;

        await db.transaction(async (tx) => {
            const [user] = await tx
                .select({
                    id: users.id,
                    balance: users.balance,
                    level: users.level,
                })
                .from(users)
                .where(eq(users.id, data.user_id));

            if (!user) {
                throw { status: 404, message: "Người dùng không tồn tại" };
            }

            const [packageInfo] = await tx
                .select({
                    id: topupPackages.id,
                    package_name: topupPackages.package_name,
                    price: topupPackages.price,
                    origin_price: topupPackages.origin_price,
                    price_basic: topupPackages.price_basic,
                    price_pro: topupPackages.price_pro,
                    price_plus: topupPackages.price_plus,
                    game_name: games.name,
                })
                .from(topupPackages)
                .innerJoin(games, eq(topupPackages.game_id, games.id))
                .where(eq(topupPackages.id, data.package_id));

            if (!packageInfo) {
                throw { status: 404, message: "Gói nạp không tồn tại" };
            }

            let unitPrice = packageInfo.price;
            const level = user.level || 1;

            if (level === 1 && packageInfo.price_basic) unitPrice = packageInfo.price_basic;
            if (level === 2 && packageInfo.price_pro) unitPrice = packageInfo.price_pro;
            if (level === 3 && packageInfo.price_plus) unitPrice = packageInfo.price_plus;

            const finalPrice = Number(unitPrice || 0) * qty;
            if (Number(user.balance) < finalPrice) {
                const missing = finalPrice - Number(user.balance);
                throw {
                    status: 400,
                    message: `Số dư không đủ. Hiện có ${Number(user.balance).toLocaleString("vi-VN")}đ, cần ${finalPrice.toLocaleString("vi-VN")}đ, thiếu ${missing.toLocaleString("vi-VN")}đ.`,
                };
            }

            const originPrice = Number(packageInfo.origin_price || 0) * qty;
            const finalProfit = finalPrice - originPrice;
            const description = `Thanh toán gói ${packageInfo.package_name} - ${packageInfo.game_name} (x${qty})`;

            const balanceBefore = Number(user.balance);
            const balanceAfter = balanceBefore - finalPrice;

            await tx.update(users).set({ balance: balanceAfter }).where(eq(users.id, data.user_id));

            await tx.insert(balanceHistory).values({
                user_id: data.user_id,
                amount: -finalPrice,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                type: "debit",
                description,
            });

            try {
                emitToUser(data.user_id, "balance_update", balanceAfter);
            } catch (socketError) {
                console.error("[OrderService] Failed to emit balance_update:", socketError);
            }

            await tx.insert(orders).values({
                user_id: data.user_id,
                package_id: data.package_id,
                account_info: data.account_info,
                amount: finalPrice,
                profit: finalProfit,
                quantity: qty,
                status: "pending",
            });

            const [created] = await tx.select().from(orders).orderBy(desc(orders.id)).limit(1);
            createdOrder = created;
        });

        if (createdOrder) {
            OrderService.processOrderExternal(createdOrder, data.package_id, data.account_info).catch((error) => {
                console.error(`[OrderService] Error in processOrderExternal for Order #${createdOrder.id}:`, error);
            });
        }

        return createdOrder;
    },

    processOrderExternal: async (order, packageId, accountInfoData) => {
        const ProviderService = require("../nguona/nguona.service");

        try {
            const [pkg] = await db.select().from(topupPackages).where(eq(topupPackages.id, packageId));
            if (!pkg) {
                console.error(`[OrderService] Package ${packageId} not found for Order #${order.id}`);
                return false;
            }

            const [game] = await db.select().from(games).where(eq(games.id, pkg.game_id));
            if (!game || !isPartnerSource(game.api_source)) {
                return false;
            }

            if (!game.api_id || !pkg.api_id) {
                console.error(`[OrderService] Missing external IDs for Order #${order.id}`);
                return false;
            }

            const partnerAccountInfo = buildPartnerGameAccountInfo(game, accountInfoData || order.account_info);
            const quantity = Number(order.quantity) > 0 ? Number(order.quantity) : 1;

            const res = await ProviderService.createOrder({
                orderId: order.id,
                gameApiId: game.api_id,
                packageApiId: pkg.api_id,
                accountInfo: partnerAccountInfo,
                quantity,
            });

            if (!(res && res.status === "success" && res.data && res.data.id)) {
                console.error(`[OrderService] External order forward failed for #${order.id}:`, res?.message || "Unknown error");
                return false;
            }

            const localStatus = mapExternalStatus(res.data.orderStatus);

            await db.update(orders)
                .set({
                    api_id: String(res.data.id),
                    status: localStatus === "success" ? "processing" : localStatus,
                    updated_at: new Date(),
                })
                .where(eq(orders.id, order.id));

            if (localStatus === "success") {
                await OrderService.completeOrder(order.id);
            } else if (localStatus === "cancelled") {
                await OrderService.cancelOrderAndRefund(order.id);
            } else if (localStatus === "partial") {
                await db.update(orders)
                    .set({ status: "partial", updated_at: new Date() })
                    .where(eq(orders.id, order.id));
            }

            return true;
        } catch (error) {
            console.error("[OrderService] Error executing processOrderExternal:", error);
            return false;
        }
    },

    syncOrderWithProvider: async (orderId, actor) => {
        assertAdminActor(actor);
        const ProviderService = require("../nguona/nguona.service");
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

        if (!order) {
            throw { status: 404, message: "Đơn hàng không tồn tại" };
        }

        if (!order.api_id) {
            return {
                status: false,
                updated: false,
                message: "Đơn hàng chưa có mã đối tác",
            };
        }

        const [pkg] = await db.select().from(topupPackages).where(eq(topupPackages.id, order.package_id));
        const [game] = pkg ? await db.select().from(games).where(eq(games.id, pkg.game_id)) : [null];

        if (!pkg || !game || !isPartnerSource(game.api_source)) {
            return {
                status: false,
                updated: false,
                message: "Đơn hàng này không dùng nguồn đối tác",
            };
        }

        const res = await ProviderService.checkOrderStatus(order.api_id);
        if (!(res && res.success && res.data)) {
            return {
                status: false,
                updated: false,
                message: res?.message || "Không lấy được trạng thái đơn từ đối tác",
            };
        }

        const localStatus = mapExternalStatus(res.data.status);
        let updated = false;

        if (localStatus === "success") {
            if (order.status !== "success") {
                await OrderService.completeOrder(order.id, actor);
                updated = true;
            }
        } else if (localStatus === "cancelled") {
            if (!["cancelled", "failed"].includes(order.status)) {
                await OrderService.cancelOrderAndRefund(order.id, actor);
                updated = true;
            }
        } else if (localStatus === "partial") {
            if (order.status !== "partial") {
                await db.update(orders)
                    .set({ status: "partial", updated_at: new Date() })
                    .where(eq(orders.id, order.id));
                updated = true;
            }
        } else if (order.status !== "processing") {
            await db.update(orders)
                .set({ status: "processing", updated_at: new Date() })
                .where(eq(orders.id, order.id));
            updated = true;
        }

        return {
            status: true,
            updated,
            remote_status: localStatus,
            remote_raw_status: res.data.status,
            message: updated ? "Đơn hàng đã được đồng bộ" : "Trạng thái đơn hàng không thay đổi",
        };
    },

    syncAllExternalOrders: async (actor) => {
        assertAdminActor(actor);
        const syncableOrders = await db
            .select({ id: orders.id })
            .from(orders)
            .where(and(inArray(orders.status, ["processing", "partial"]), isNotNull(orders.api_id)));

        let updated = 0;

        for (const order of syncableOrders) {
            try {
                const result = await OrderService.syncOrderWithProvider(order.id, actor);
                if (result?.updated) {
                    updated += 1;
                }
            } catch (error) {
                console.error(`[OrderService] Failed to sync order #${order.id}:`, error.message || error);
            }
        }

        return {
            status: true,
            scanned: syncableOrders.length,
            updated,
        };
    },

    getAllOrders: async (page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;
        const base = buildOrderQuery();

        const data = await base
            .joins(db.select(base.selection).from(base.from))
            .orderBy(desc(orders.updated_at))
            .limit(limit)
            .offset(offset);

        const [total] = await db.select({ count: sql`COUNT(*)` }).from(orders);
        const statsResult = await db
            .select({
                status: orders.status,
                count: sql`COUNT(*)`,
            })
            .from(orders)
            .groupBy(orders.status);

        const stats = { pending: 0, processing: 0, partial: 0, success: 0, cancelled: 0, failed: 0 };
        statsResult.forEach((row) => {
            stats[row.status] = Number(row.count);
        });

        return { orders: data, stats, total: Number(total.count) };
    },

    getOrdersByStatus: async (status, page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;
        const base = buildOrderQuery();

        const condition =
            status === "failed_cancelled"
                ? inArray(orders.status, ["failed", "cancelled"])
                : eq(orders.status, status);

        const data = await base
            .joins(db.select(base.selection).from(base.from))
            .where(condition)
            .orderBy(desc(orders.updated_at))
            .limit(limit)
            .offset(offset);

        const [total] = await db.select({ count: sql`COUNT(*)` }).from(orders).where(condition);

        return { orders: data, total: Number(total.count) };
    },

    getOrdersByUserId: async (userId, page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;
        const base = buildOrderQuery();

        const data = await base
            .joins(db.select(base.selection).from(base.from))
            .where(eq(orders.user_id, userId))
            .orderBy(desc(orders.updated_at))
            .limit(limit)
            .offset(offset);

        const [total] = await db.select({ count: sql`COUNT(*)` }).from(orders).where(eq(orders.user_id, userId));

        return { orders: data, total: Number(total.count) };
    },

    searchOrders: async (keyword, page = 1) => {
        const limit = 10;
        const offset = (page - 1) * limit;
        const base = buildOrderQuery();
        const usersNap = aliasedTable(users, "user_nap");

        const searchTerm = `%${keyword}%`;
        const searchCondition = or(
            sql`CAST(${orders.id} AS CHAR) LIKE ${searchTerm}`,
            like(users.email, searchTerm),
            like(usersNap.email, searchTerm),
            like(topupPackages.package_name, searchTerm),
            like(games.name, searchTerm)
        );

        const data = await db
            .select(base.selection)
            .from(orders)
            .innerJoin(users, eq(orders.user_id, users.id))
            .leftJoin(usersNap, eq(orders.user_id_nap, usersNap.id))
            .leftJoin(topupPackages, eq(orders.package_id, topupPackages.id))
            .leftJoin(games, eq(topupPackages.game_id, games.id))
            .where(searchCondition)
            .orderBy(desc(orders.updated_at))
            .limit(limit)
            .offset(offset);

        const [total] = await db
            .select({ count: sql`COUNT(*)` })
            .from(orders)
            .innerJoin(users, eq(orders.user_id, users.id))
            .leftJoin(usersNap, eq(orders.user_id_nap, usersNap.id))
            .leftJoin(topupPackages, eq(orders.package_id, topupPackages.id))
            .leftJoin(games, eq(topupPackages.game_id, games.id))
            .where(searchCondition);

        return { orders: data, total: Number(total.count) };
    },

    getOrderById: async (id) => {
        const base = buildOrderQuery();
        const [order] = await base.joins(db.select(base.selection).from(base.from)).where(eq(orders.id, id));
        return order;
    },

    getTransactionHistory: async (userId, page = 1, limit = 10) => {
        const offset = (page - 1) * limit;

        const transactions = await db
            .select()
            .from(balanceHistory)
            .where(eq(balanceHistory.user_id, userId))
            .orderBy(desc(balanceHistory.created_at))
            .limit(limit)
            .offset(offset);

        const [countResult] = await db
            .select({ count: sql`COUNT(*)` })
            .from(balanceHistory)
            .where(eq(balanceHistory.user_id, userId));

        const total = Number(countResult.count);

        return {
            transactions,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    },

    acceptOrder: async (id, adminId, actor) => {
        assertAdminActor(actor);
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        if (!order) throw { status: 404, message: "Đơn hàng không tồn tại" };

        await db
            .update(orders)
            .set({
                status: "processing",
                user_id_nap: adminId,
                updated_at: new Date(),
            })
            .where(eq(orders.id, id));

        return OrderService.getOrderById(id);
    },

    changeOrderStatus: async (id, status, actor) => {
        if (actor) {
            assertAdminActor(actor);
        }
        await db.update(orders).set({ status, updated_at: new Date() }).where(eq(orders.id, id));
        const base = buildOrderQuery();
        const [updated] = await base.joins(db.select(base.selection).from(base.from)).where(eq(orders.id, id));
        return updated;
    },

    updateOrder: async (id, data) => {
        const updateData = {};

        if (data.status !== undefined) updateData.status = data.status;
        if (data.api_id !== undefined) updateData.api_id = data.api_id;
        if (data.account_info !== undefined) updateData.account_info = data.account_info;
        if (data.user_id_nap !== undefined) updateData.user_id_nap = data.user_id_nap;

        if (Object.keys(updateData).length === 0) {
            throw { status: 400, message: "Không có dữ liệu để cập nhật" };
        }

        updateData.updated_at = new Date();
        await db.update(orders).set(updateData).where(eq(orders.id, id));

        return OrderService.getOrderById(id);
    },

    deleteOrder: async (id) => {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        if (!order) {
            throw { status: 404, message: "Đơn hàng không tồn tại" };
        }

        await db.delete(orders).where(eq(orders.id, id));
        return order;
    },

    cancelOrderIfPending: async (id, userId) => {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        if (!order) throw { status: 404, message: "Not found" };
        if (order.user_id !== userId) throw { status: 403, message: "Unauthorized" };
        if (order.status !== "pending") throw { status: 400, message: "Cannot cancel non-pending order" };

        await db.update(orders).set({ status: "cancelled", updated_at: new Date() }).where(eq(orders.id, id));
        await UserService.updateBalance(userId, order.amount, "credit", `Hoàn tiền đơn hàng #${id}`);

        return { message: "Cancelled and refunded" };
    },

    completeOrder: async (id, actor) => {
        if (actor) {
            assertAdminActor(actor);
        }
        const updatedOrder = await OrderService.changeOrderStatus(id, "success", actor);

        try {
            emitToUser(updatedOrder.user_id, "order_status_update", {
                orderId: id,
                status: "success",
                packageName: updatedOrder.package_name,
                amount: updatedOrder.amount,
                message: "Đơn hàng đã hoàn thành.",
            });
        } catch (socketError) {
            console.error("[OrderService] Failed to emit success socket:", socketError);
        }

        if (updatedOrder?.user_email) {
            try {
                await sendOrderSuccessEmail(updatedOrder.user_email, updatedOrder);
            } catch (emailError) {
                console.error("[OrderService] Failed to send order success email:", emailError);
            }
        }

        return updatedOrder;
    },

    cancelOrderAndRefund: async (id, actor) => {
        if (actor) {
            assertAdminActor(actor);
        }
        const order = await OrderService.getOrderById(id);
        if (!order) throw { status: 404, message: "Đơn hàng không tồn tại" };

        await db.update(orders).set({ status: "cancelled", updated_at: new Date() }).where(eq(orders.id, id));

        const refundAmount = Number(order.amount);
        await UserService.updateBalance(order.user_id, refundAmount, "credit", `Hoàn tiền đơn hàng #${id}`);

        try {
            emitToUser(order.user_id, "order_status_update", {
                orderId: id,
                status: "cancelled",
                packageName: order.package_name,
                refundAmount,
                message: "Đơn hàng đã bị hủy và hoàn tiền.",
            });
        } catch (socketError) {
            console.error("[OrderService] Failed to emit cancel socket:", socketError);
        }

        if (order?.user_email) {
            try {
                await sendOrderFailureEmail(order.user_email, order, "Đơn hàng đã bị hủy và hoàn tiền");
            } catch (emailError) {
                console.error("[OrderService] Failed to send order failure email:", emailError);
            }
        }

        return { message: "Cancelled and refunded", refundAmount };
    },

    getUserFinancialSummary: async (userId) => {
        const [result] = await db.execute(sql`
           SELECT
             (SELECT COALESCE(SUM(amount), 0) FROM orders WHERE user_id = ${userId} AND status = 'success') AS tong_tieu,
             (SELECT COALESCE(SUM(amount), 0) FROM orders WHERE user_id = ${userId} AND status = 'success' AND DATE_FORMAT(updated_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')) AS tong_tieu_thang,
             (SELECT COALESCE(SUM(amount), 0) FROM topup_wallet_logs WHERE user_id = ${userId} AND status = 'Thành Công') AS tong_nap,
             (SELECT COALESCE(SUM(amount), 0) FROM topup_wallet_logs WHERE user_id = ${userId} AND status = 'Thành Công' AND DATE_FORMAT(updated_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')) AS tong_nap_thang
        `);

        return result[0];
    },

    getCostSummary: async () => {
        const [result] = await db.execute(sql`
             SELECT 
              (SELECT COALESCE(SUM(amount - profit), 0) FROM orders WHERE status = 'success') AS total_cost,
              (SELECT COALESCE(SUM(amount - profit), 0) FROM orders WHERE status = 'success' AND DATE_FORMAT(updated_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')) AS total_cost_this_month,
              (SELECT COALESCE(SUM(amount - profit), 0) FROM orders WHERE status = 'success' AND DATE(updated_at) = CURRENT_DATE) AS total_cost_today
         `);

        const last30Days = await db.execute(sql`
            SELECT 
                DATE(updated_at) as date,
                COALESCE(SUM(amount - profit), 0) as total_cost
            FROM orders
            WHERE status = 'success'
                AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY DATE(updated_at)
            ORDER BY date ASC
        `);

        return {
            status: true,
            total_cost: Number(result[0].total_cost),
            total_cost_this_month: Number(result[0].total_cost_this_month),
            total_cost_today: Number(result[0].total_cost_today),
            last_30_days: last30Days[0].map((row) => ({
                date: row.date,
                total_cost: Number(row.total_cost),
            })),
        };
    },

    getMyNapOrdersStats: async (userIdNap) => {
        return db
            .select({
                status: orders.status,
                total: sql`COUNT(*)`,
            })
            .from(orders)
            .where(eq(orders.user_id_nap, userIdNap))
            .groupBy(orders.status);
    },

    getOrderSummary3: async (userIdNap) => {
        const stats = await OrderService.getMyNapOrdersStats(userIdNap);
        return stats.reduce((acc, item) => {
            acc[item.status] = Number(item.total);
            return acc;
        }, {});
    },
};

OrderService.getCostStats = OrderService.getCostSummary;

module.exports = OrderService;
