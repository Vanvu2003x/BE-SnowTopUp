const { db } = require("../../configs/drizzle");
const { users, balanceHistory } = require("../../db/schema");
const { eq, sql } = require("drizzle-orm");

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 50;

const normalizePagination = (page, pageSize) => {
    const normalizedPage = Math.max(1, Number(page) || DEFAULT_PAGE);
    const normalizedPageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE));

    return {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        offset: (normalizedPage - 1) * normalizedPageSize,
    };
};

const buildUserWhereClause = (alias, role, keyword) => {
    const normalizedRole = String(role || "").trim();
    const normalizedKeyword = String(keyword || "").trim();
    const likeKeyword = `%${normalizedKeyword}%`;

    if (normalizedRole && normalizedKeyword) {
        return sql`WHERE ${sql.raw(alias)}.role = ${normalizedRole} AND (${sql.raw(alias)}.name LIKE ${likeKeyword} OR ${sql.raw(alias)}.email LIKE ${likeKeyword})`;
    }

    if (normalizedRole) {
        return sql`WHERE ${sql.raw(alias)}.role = ${normalizedRole}`;
    }

    if (normalizedKeyword) {
        return sql`WHERE (${sql.raw(alias)}.name LIKE ${likeKeyword} OR ${sql.raw(alias)}.email LIKE ${likeKeyword})`;
    }

    return sql``;
};

const buildUserScopedWhereClause = (alias, role, keyword, extraCondition) => {
    const normalizedRole = String(role || "").trim();
    const normalizedKeyword = String(keyword || "").trim();
    const likeKeyword = `%${normalizedKeyword}%`;
    const conditions = [];

    if (normalizedRole) {
        conditions.push(sql`${sql.raw(alias)}.role = ${normalizedRole}`);
    }

    if (normalizedKeyword) {
        conditions.push(sql`(${sql.raw(alias)}.name LIKE ${likeKeyword} OR ${sql.raw(alias)}.email LIKE ${likeKeyword})`);
    }

    if (extraCondition) {
        conditions.push(extraCondition);
    }

    if (!conditions.length) {
        return sql``;
    }

    return sql`WHERE ${sql.join(conditions, sql` AND `)}`;
};

const fetchUserSummary = async (role, keyword) => {
    const userWhere = buildUserWhereClause("u", role, keyword);
    const walletWhere = buildUserScopedWhereClause("wu", role, keyword, sql`tw.status = 'Thành Công'`);
    const orderWhere = buildUserScopedWhereClause("ou", role, keyword, sql`o.status = 'success'`);

    const [summaryRows] = await db.execute(sql`
        SELECT
            COUNT(*) AS total_users,
            COALESCE(SUM(CASE WHEN u.status = 'banned' THEN 1 ELSE 0 END), 0) AS locked_users,
            COALESCE(SUM(CASE WHEN u.level = 3 THEN 1 ELSE 0 END), 0) AS vip_users,
            COALESCE(SUM(u.balance), 0) AS total_balance,
            COALESCE((
                SELECT SUM(tw.amount)
                FROM topup_wallet_logs tw
                INNER JOIN users wu ON wu.id = tw.user_id
                ${walletWhere}
            ), 0) AS total_deposited,
            COALESCE((
                SELECT COUNT(*)
                FROM orders o
                INNER JOIN users ou ON ou.id = o.user_id
                ${orderWhere}
            ), 0) AS total_successful_orders
        FROM users u
        ${userWhere}
    `);

    const summary = summaryRows[0] || {};

    return {
        totalUsers: Number(summary.total_users || 0),
        lockedUsers: Number(summary.locked_users || 0),
        vipUsers: Number(summary.vip_users || 0),
        totalBalance: Number(summary.total_balance || 0),
        totalDeposited: Number(summary.total_deposited || 0),
        totalSuccessfulOrders: Number(summary.total_successful_orders || 0),
    };
};

const UserService = {
    getInfo: async (userId) => {
        if (!userId) {
            throw { status: 401, message: "Chua xac thuc nguoi dung" };
        }

        const [userInfo] = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            balance: users.balance,
            role: users.role,
            level: users.level,
            created_at: users.created_at,
        }).from(users).where(eq(users.id, userId));

        if (!userInfo) {
            throw { status: 404, message: "Khong tim thay nguoi dung" };
        }

        return { user: userInfo };
    },

    getAllUser: async (role) => {
        const whereClause = buildUserWhereClause("u", role, "");
        const [result] = await db.execute(sql`
            SELECT
                u.id, u.name, u.email, u.hash_password, u.role, u.level, u.balance, u.status, u.created_at, u.updated_at,
                COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'success'), 0) AS so_don_order,
                COALESCE((SELECT COUNT(*) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) AS so_don_da_nap,
                COALESCE((SELECT SUM(amount) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) AS tong_amount
            FROM users u
            ${whereClause}
            ORDER BY u.created_at DESC
        `);

        return {
            status: true,
            data: result,
            totalUser: result.length,
        };
    },

    updateUserRole: async (targetUserId, newRole) => {
        const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));

        if (!targetUser) throw { status: 404, message: "Khong tim thay nguoi dung can cap nhat" };
        if (targetUser.role === "admin") throw { status: 403, message: "Khong the thay doi role cua admin" };

        await db.update(users)
            .set({ role: newRole })
            .where(eq(users.id, targetUserId));

        const [updatedUser] = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            level: users.level,
            balance: users.balance,
            created_at: users.created_at,
        }).from(users).where(eq(users.id, targetUserId));

        return { message: "Cap nhat role thanh cong", user: updatedUser };
    },

    getUserById: async (userId) => {
        if (!userId) {
            throw { status: 400, message: "Thieu tham so user_id" };
        }

        const [userInfo] = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            balance: users.balance,
            role: users.role,
            level: users.level,
            created_at: users.created_at,
        }).from(users).where(eq(users.id, userId));

        if (!userInfo) {
            throw { status: 404, message: "Khong tim thay nguoi dung" };
        }

        return userInfo;
    },

    updateBalance: async (userId, amount, type, description = "") => {
        if (!userId || !amount || !type) {
            throw { status: 400, message: "Thieu tham so bat buoc" };
        }

        if (typeof amount !== "number" || amount <= 0) {
            throw { status: 400, message: "Amount phai la so duong" };
        }

        if (!["credit", "debit"].includes(type)) {
            throw { status: 400, message: "Type phai la 'credit' hoac 'debit'" };
        }

        const adjustedAmount = type === "credit" ? amount : -amount;

        const success = await db.transaction(async (tx) => {
            const [user] = await tx.select().from(users).where(eq(users.id, userId));
            if (!user) return false;

            const balanceBefore = user.balance || 0;
            const balanceAfter = balanceBefore + adjustedAmount;

            if (type === "debit" && balanceAfter < 0) {
                const missing = amount - balanceBefore;
                throw {
                    status: 400,
                    message: `So du khong du! Hien co: ${balanceBefore.toLocaleString("vi-VN")}đ. Can: ${amount.toLocaleString("vi-VN")}đ. Thieu: ${missing.toLocaleString("vi-VN")}đ.`,
                };
            }

            await tx.update(users)
                .set({ balance: balanceAfter })
                .where(eq(users.id, userId));

            await tx.insert(balanceHistory).values({
                user_id: userId,
                amount: adjustedAmount,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                type,
                description: String(description || "").trim() || (type === "credit" ? "Nap vi tu admin" : "Tru tien tu admin"),
            });

            return true;
        });

        if (!success) {
            throw { status: 404, message: "Khong tim thay user hoac cap nhat that bai" };
        }

        const [updatedUser] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId));
        const newBalance = updatedUser.balance;
        const { emitToUser } = require("../../sockets/websocket");

        emitToUser(userId, "balance_update", newBalance);
        emitToUser(userId, "payment_success", {
            redirect: true,
            url: "/",
            message: "Thanh toan thanh cong!",
            balance: newBalance,
        });

        return { message: "Cap nhat so du thanh cong", balance: newBalance };
    },

    searchUser: async (role, keyword, page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) => {
        const pagination = normalizePagination(page, pageSize);
        const whereClause = buildUserWhereClause("u", role, keyword);

        const [userRows] = await db.execute(sql`
            SELECT
                u.id, u.name, u.email, u.hash_password, u.role, u.level, u.balance, u.status, u.created_at, u.updated_at,
                COALESCE((SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status = 'success'), 0) AS so_don_order,
                COALESCE((SELECT COUNT(*) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) AS so_don_da_nap,
                COALESCE((SELECT SUM(amount) FROM topup_wallet_logs tw WHERE tw.user_id = u.id AND tw.status = 'Thành Công'), 0) AS tong_amount
            FROM users u
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT ${pagination.pageSize} OFFSET ${pagination.offset}
        `);

        const [countRows] = await db.execute(sql`
            SELECT COUNT(*) AS total_items
            FROM users u
            ${whereClause}
        `);

        const totalItems = Number(countRows[0]?.total_items || 0);
        const totalPages = Math.max(1, Math.ceil(totalItems / pagination.pageSize));
        const summary = await fetchUserSummary(role, keyword);

        return {
            success: true,
            users: userRows,
            pagination: {
                page: pagination.page,
                pageSize: pagination.pageSize,
                totalItems,
                totalPages,
            },
            summary,
        };
    },

    toggleUserLock: async (userId) => {
        if (!userId) {
            throw { status: 400, message: "Thieu user ID" };
        }

        const [user] = await db.select().from(users).where(eq(users.id, userId));

        if (!user) {
            throw { status: 404, message: "Khong tim thay nguoi dung" };
        }

        if (user.role === "admin") {
            throw { status: 403, message: "Khong the khoa tai khoan admin" };
        }

        const newStatus = user.status === "banned" ? "active" : "banned";
        const isLocked = newStatus === "banned";

        await db.update(users)
            .set({ status: newStatus })
            .where(eq(users.id, userId));

        return {
            success: true,
            locked: isLocked,
            message: isLocked ? "Da khoa tai khoan" : "Da mo khoa tai khoan",
        };
    },

    updateUserLevel: async (targetUserId, newLevel) => {
        if (!targetUserId || !newLevel) {
            throw { status: 400, message: "Thieu tham so bat buoc" };
        }

        const level = parseInt(newLevel, 10);
        if (![1, 2, 3].includes(level)) {
            throw { status: 400, message: "Level phai la 1 (Basic), 2 (Pro), hoac 3 (Plus)" };
        }

        const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId));

        if (!targetUser) {
            throw { status: 404, message: "Khong tim thay nguoi dung" };
        }

        await db.update(users)
            .set({ level })
            .where(eq(users.id, targetUserId));

        const levelLabels = { 1: "Basic", 2: "Pro", 3: "Plus" };

        const [updatedUser] = await db.select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            level: users.level,
            balance: users.balance,
        }).from(users).where(eq(users.id, targetUserId));

        return {
            success: true,
            message: `Da cap nhat level thanh ${levelLabels[level]}`,
            user: updatedUser,
        };
    },
};

module.exports = UserService;
