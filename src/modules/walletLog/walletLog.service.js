const { db } = require("../../configs/drizzle");
const { walletLogs, users } = require("../../db/schema");
const { eq, gte, lte, and, or, sql, desc, like, inArray } = require("drizzle-orm");
const UserService = require("../user/user.service");

const PAGE_SIZE = 10;
const STATUS_GROUPS = {
    all: [],
    pending: ["Đang Chờ", "pending", "wait"],
    success: ["Thành Công"],
    failed: ["Thất Bại"],
    cancelled: ["Đã Hủy"],
};

const normalizePage = (page) => {
    const parsed = Number(page);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeMode = (mode) => {
    const normalized = String(mode || "all").toLowerCase();
    return STATUS_GROUPS[normalized] ? normalized : "all";
};

const buildWalletLogWhere = ({ search = "", mode = "all" }) => {
    const conditions = [];
    const normalizedMode = normalizeMode(mode);
    const normalizedSearch = String(search || "").trim();

    if (STATUS_GROUPS[normalizedMode].length > 0) {
        conditions.push(inArray(walletLogs.status, STATUS_GROUPS[normalizedMode]));
    }

    if (normalizedSearch) {
        const searchTerm = `%${normalizedSearch}%`;
        conditions.push(
            or(
                like(walletLogs.id, searchTerm),
                like(users.email, searchTerm),
                like(users.name, searchTerm)
            )
        );
    }

    if (conditions.length === 0) {
        return undefined;
    }

    return and(...conditions);
};

const assertAdminActor = (actor) => {
    if (!actor || actor.role !== "admin") {
        throw { status: 403, message: "Khong du quyen han" };
    }
};

const walletLogSelection = {
    id: walletLogs.id,
    user_id: walletLogs.user_id,
    amount: walletLogs.amount,
    status: walletLogs.status,
    created_at: walletLogs.created_at,
    update_at: walletLogs.updated_at,
    email: users.email,
    name_user: users.name,
};

const WalletLogService = {
    getTongTienTrongKhoang: async (userId, from, to, actor) => {
        assertAdminActor(actor);
        const conditions = [eq(walletLogs.status, "Thành Công")];

        if (userId) conditions.push(eq(walletLogs.user_id, userId));
        if (from) conditions.push(gte(walletLogs.created_at, new Date(from)));
        if (to) conditions.push(lte(walletLogs.created_at, new Date(to)));

        const [result] = await db
            .select({
                total: sql`COALESCE(SUM(${walletLogs.amount}), 0)`,
            })
            .from(walletLogs)
            .where(and(...conditions));

        return {
            total_amount: Number(result.total),
        };
    },

    getWalletLog: async (page = 1, search = "", mode = "all", actor) => {
        assertAdminActor(actor);
        const currentPage = normalizePage(page);
        const offset = (currentPage - 1) * PAGE_SIZE;
        const whereClause = buildWalletLogWhere({ search, mode });

        const data = await db
            .select(walletLogSelection)
            .from(walletLogs)
            .leftJoin(users, eq(walletLogs.user_id, users.id))
            .where(whereClause)
            .orderBy(desc(walletLogs.created_at))
            .limit(PAGE_SIZE)
            .offset(offset);

        const [total] = await db
            .select({ count: sql`COUNT(*)` })
            .from(walletLogs)
            .leftJoin(users, eq(walletLogs.user_id, users.id))
            .where(whereClause);

        const totalItem = Number(total.count || 0);

        return {
            status: true,
            data,
            totalItem,
            page: currentPage,
            pageSize: PAGE_SIZE,
            totalPages: Math.max(1, Math.ceil(totalItem / PAGE_SIZE)),
            mode: normalizeMode(mode),
        };
    },

    getWalletLogStatusDone: async (page = 1, actor) => {
        return WalletLogService.getWalletLog(page, "", "success", actor);
    },

    getPendingLogs: async (page = 1, search = "", actor) => {
        return WalletLogService.getWalletLog(page, search, "pending", actor);
    },

    getTongSoTienDaNap: async (userId, actor) => {
        assertAdminActor(actor);
        const conditions = [eq(walletLogs.status, "Thành Công")];

        if (userId) conditions.push(eq(walletLogs.user_id, userId));

        const [result] = await db
            .select({
                total: sql`COALESCE(SUM(${walletLogs.amount}), 0)`,
            })
            .from(walletLogs)
            .where(and(...conditions));

        return {
            total_amount: Number(result.total),
        };
    },

    manualChargeBalance: async (id, newStatus, actor) => {
        assertAdminActor(actor);
        const [log] = await db.select().from(walletLogs).where(eq(walletLogs.id, id));
        if (!log) throw { status: 404, message: "Không tìm thấy giao dịch" };

        if (["Thành Công", "Thất Bại", "Đã Hủy"].includes(log.status)) {
            throw { status: 400, message: "Giao dịch đã kết thúc, không thể thay đổi trạng thái" };
        }

        await db
            .update(walletLogs)
            .set({
                status: newStatus,
                updated_at: new Date(),
            })
            .where(eq(walletLogs.id, id));

        if (newStatus === "Thành Công") {
            await UserService.updateBalance(
                log.user_id,
                Number(log.amount),
                "credit",
                `Duyet giao dich nap vi #${log.id}`,
                actor
            );
        }

        return { message: "Cập nhật trạng thái thành công" };
    },

    cancelWalletLog: async (id, userId) => {
        const [log] = await db.select().from(walletLogs).where(eq(walletLogs.id, id));
        if (!log) throw { status: 404, message: "Không tìm thấy giao dịch" };

        if (log.user_id !== userId) throw { status: 403, message: "Không có quyền hủy giao dịch này" };

        if (!["pending", "Chờ thanh toán", "Đang Chờ", "wait"].includes(log.status)) {
            throw { status: 400, message: "Chỉ có thể hủy giao dịch đang chờ" };
        }

        await db
            .update(walletLogs)
            .set({ status: "Đã Hủy", updated_at: new Date() })
            .where(eq(walletLogs.id, id));

        return { message: "Hủy giao dịch thành công" };
    },

    getLogsByUser: async (userId, page = 1) => {
        const currentPage = normalizePage(page);
        const offset = (currentPage - 1) * PAGE_SIZE;

        const data = await db
            .select()
            .from(walletLogs)
            .where(eq(walletLogs.user_id, userId))
            .orderBy(desc(walletLogs.created_at))
            .limit(PAGE_SIZE)
            .offset(offset);

        const [total] = await db
            .select({ count: sql`COUNT(*)` })
            .from(walletLogs)
            .where(eq(walletLogs.user_id, userId));

        const totalLog = Number(total.count || 0);

        return {
            status: true,
            data,
            totalLog,
            totalPages: Math.max(1, Math.ceil(totalLog / PAGE_SIZE)),
            page: currentPage,
            pageSize: PAGE_SIZE,
        };
    },

    autoCheckExpiredTransactions: async () => {
        try {
            const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

            return await db
                .update(walletLogs)
                .set({
                    status: "Thất Bại",
                    updated_at: new Date(),
                })
                .where(
                    and(
                        inArray(walletLogs.status, STATUS_GROUPS.pending),
                        lte(walletLogs.created_at, twentyMinutesAgo)
                    )
                );
        } catch (error) {
            console.error("Error auto-expiring transactions:", error);
        }
    },
};

module.exports = WalletLogService;
