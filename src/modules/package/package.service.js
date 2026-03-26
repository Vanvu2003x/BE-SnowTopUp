const { db } = require("../../configs/drizzle");
const { topupPackages, games } = require("../../db/schema");
const { eq, and, ilike, asc, sql } = require("drizzle-orm");
const crypto = require("crypto");
const { deleteFile } = require("../../utils/file.util");

const normalizeString = (value, maxLength = 255) => {
    if (value === undefined || value === null) {
        return undefined;
    }

    const normalized = String(value).trim();
    return normalized ? normalized.substring(0, maxLength) : null;
};

const normalizeInteger = (value, fallback = 0) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
        return fallback;
    }

    return Math.max(0, Math.round(numeric));
};

const normalizePercent = (value, fallback = 0) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
        return fallback;
    }

    return numeric;
};

const normalizeBoolean = (value, fallback = false) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    if (typeof value === "string") {
        return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    }

    return Boolean(value);
};

const normalizeStatus = (value, fallback = "active") => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const normalized = String(value).trim().toLowerCase();
    return normalized === "inactive" ? "inactive" : "active";
};

const computePriceFromPercent = (originPrice, percent) =>
    Math.max(0, Math.ceil(Number(originPrice || 0) * (1 + Number(percent || 0) / 100)));

const resolveDisplayName = (pkg) =>
    pkg?.custom_package_name || pkg?.api_package_name || pkg?.package_name || null;

const hydratePackage = (pkg) => {
    if (!pkg) {
        return null;
    }

    return {
        ...pkg,
        package_name: resolveDisplayName(pkg),
    };
};

const buildNameFields = (data = {}, currentPkg = null) => {
    const nextApiName = normalizeString(data.api_package_name, 255);
    const nextCustomName = normalizeString(data.custom_package_name, 255);
    const fallbackName = normalizeString(data.package_name, 255);

    const apiPackageName =
        nextApiName !== undefined
            ? nextApiName
            : currentPkg?.api_package_name || currentPkg?.package_name || fallbackName || null;

    const customPackageName =
        nextCustomName !== undefined
            ? nextCustomName
            : currentPkg
                ? currentPkg.custom_package_name
                : null;

    return {
        api_package_name: apiPackageName,
        custom_package_name: customPackageName,
        package_name: customPackageName || apiPackageName || fallbackName || currentPkg?.package_name || null,
    };
};

const buildPricingFields = (data = {}, currentPkg = null) => {
    const originPrice = normalizeInteger(
        data.origin_price,
        currentPkg?.origin_price !== undefined ? currentPkg.origin_price : 0
    );
    const apiPrice = normalizeInteger(
        data.api_price,
        currentPkg?.api_price !== undefined ? currentPkg.api_price : originPrice
    );

    const basicPercent = normalizePercent(
        data.profit_percent_basic,
        currentPkg?.profit_percent_basic !== undefined ? currentPkg.profit_percent_basic : 0
    );
    const proPercent = normalizePercent(
        data.profit_percent_pro,
        currentPkg?.profit_percent_pro !== undefined ? currentPkg.profit_percent_pro : 0
    );
    const plusPercent = normalizePercent(
        data.profit_percent_plus,
        currentPkg?.profit_percent_plus !== undefined ? currentPkg.profit_percent_plus : 0
    );

    return {
        api_price: apiPrice,
        origin_price: originPrice,
        profit_percent_basic: basicPercent,
        profit_percent_pro: proPercent,
        profit_percent_plus: plusPercent,
        profit_percent_user: currentPkg?.profit_percent_user || 0,
        price_basic: computePriceFromPercent(originPrice, basicPercent),
        price_pro: computePriceFromPercent(originPrice, proPercent),
        price_plus: computePriceFromPercent(originPrice, plusPercent),
        price: computePriceFromPercent(originPrice, basicPercent),
    };
};

const PackageService = {
    getAllPackages: async () => {
        const result = await db.select().from(topupPackages).orderBy(asc(topupPackages.price_basic));
        return result.map(hydratePackage);
    },

    getPackageById: async (id) => {
        const [result] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        return hydratePackage(result || null);
    },

    getPackagesByGameCode: async (game_code, id_server = null) => {
        const conditions = [eq(games.gamecode, game_code), eq(topupPackages.status, "active")];

        if (id_server) {
            conditions.push(eq(topupPackages.id_server, id_server));
        }

        const result = await db
            .select({
                id: topupPackages.id,
                api_id: topupPackages.api_id,
                api_package_name: topupPackages.api_package_name,
                custom_package_name: topupPackages.custom_package_name,
                package_name: topupPackages.package_name,
                game_id: topupPackages.game_id,
                price: topupPackages.price,
                price_basic: topupPackages.price_basic,
                price_pro: topupPackages.price_pro,
                price_plus: topupPackages.price_plus,
                origin_price: topupPackages.origin_price,
                api_price: topupPackages.api_price,
                thumbnail: topupPackages.thumbnail,
                package_type: topupPackages.package_type,
                status: topupPackages.status,
                fileAPI: topupPackages.fileAPI,
                id_server: topupPackages.id_server,
                sale: topupPackages.sale,
                profit_percent_basic: topupPackages.profit_percent_basic,
                profit_percent_pro: topupPackages.profit_percent_pro,
                profit_percent_plus: topupPackages.profit_percent_plus,
            })
            .from(topupPackages)
            .innerJoin(games, eq(topupPackages.game_id, games.id))
            .where(and(...conditions))
            .orderBy(asc(topupPackages.price_basic));

        return result.map(hydratePackage);
    },

    createPackage: async (data, file) => {
        const [game] = await db.select().from(games).where(eq(games.id, data.game_id));
        if (!game) throw { status: 404, message: "Game not found" };

        const names = buildNameFields(data);
        const pricing = buildPricingFields(data);

        const parsedFileAPI =
            data.fileAPI !== undefined && data.fileAPI !== null && data.fileAPI !== ""
                ? typeof data.fileAPI === "string"
                    ? JSON.parse(data.fileAPI)
                    : data.fileAPI
                : null;

        const newPackage = {
            id: crypto.randomUUID(),
            api_id: normalizeString(data.api_id, 100) || null,
            ...names,
            game_id: data.game_id,
            ...pricing,
            thumbnail: file?.path || normalizeString(data.thumbnail, 500) || game.thumbnail || null,
            package_type: normalizeString(data.package_type, 50) || null,
            status: normalizeStatus(data.status, "active"),
            fileAPI: parsedFileAPI,
            id_server: normalizeBoolean(data.id_server, false),
            sale: normalizeBoolean(data.sale, false),
        };

        await db.insert(topupPackages).values(newPackage);
        return await PackageService.getPackageById(newPackage.id);
    },

    patchPackage: async (id, newStatus) => {
        const normalizedStatus = normalizeStatus(newStatus, "active");
        await db.update(topupPackages).set({ status: normalizedStatus }).where(eq(topupPackages.id, id));
        return await PackageService.getPackageById(id);
    },

    updatePackage: async (id, data, file) => {
        const [currentPkg] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        if (!currentPkg) throw { status: 404, message: "Goi khong ton tai" };

        const updateData = {};
        const names = buildNameFields(data, currentPkg);

        if (
            data.package_name !== undefined ||
            data.api_package_name !== undefined ||
            data.custom_package_name !== undefined
        ) {
            updateData.api_package_name = names.api_package_name;
            updateData.custom_package_name = names.custom_package_name;
            updateData.package_name = names.package_name;
        }

        if (
            data.origin_price !== undefined ||
            data.api_price !== undefined ||
            data.profit_percent_basic !== undefined ||
            data.profit_percent_pro !== undefined ||
            data.profit_percent_plus !== undefined
        ) {
            Object.assign(updateData, buildPricingFields(data, currentPkg));
        }

        if (data.api_id !== undefined) updateData.api_id = normalizeString(data.api_id, 100) || null;
        if (data.package_type !== undefined) updateData.package_type = normalizeString(data.package_type, 50) || null;
        if (data.id_server !== undefined) updateData.id_server = normalizeBoolean(data.id_server, false);
        if (data.sale !== undefined) updateData.sale = normalizeBoolean(data.sale, false);
        if (data.status !== undefined) updateData.status = normalizeStatus(data.status, currentPkg.status || "active");
        if (data.thumbnail !== undefined) updateData.thumbnail = normalizeString(data.thumbnail, 500) || null;

        let oldThumbnailToDelete = null;
        if (file) {
            updateData.thumbnail = file.path;
            if (currentPkg.thumbnail) {
                oldThumbnailToDelete = currentPkg.thumbnail;
            }
        }

        if (data.fileAPI !== undefined) {
            try {
                updateData.fileAPI =
                    typeof data.fileAPI === "string" ? JSON.parse(data.fileAPI) : data.fileAPI;
            } catch (error) {
                updateData.fileAPI = null;
            }
        }

        if (Object.keys(updateData).length === 0) {
            throw { status: 400, message: "Khong co du lieu nao de cap nhat" };
        }

        await db.update(topupPackages).set(updateData).where(eq(topupPackages.id, id));

        const updated = await PackageService.getPackageById(id);
        if (oldThumbnailToDelete && oldThumbnailToDelete !== updated?.thumbnail) {
            deleteFile(oldThumbnailToDelete);
        }

        return updated;
    },

    getPackagesByType: async (type) => {
        const result = await db
            .select()
            .from(topupPackages)
            .where(eq(topupPackages.package_type, type))
            .orderBy(asc(topupPackages.price_basic));
        return result.map(hydratePackage);
    },

    delPackages: async (id) => {
        const [deleted] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        await db.delete(topupPackages).where(eq(topupPackages.id, id));

        if (deleted?.thumbnail) {
            deleteFile(deleted.thumbnail);
        }

        return hydratePackage(deleted || null);
    },

    searchPackages: async ({ keyword = "", game_id = null, id_server = null, sale = null }) => {
        const conditions = [sql`1=1`];

        if (keyword) {
            conditions.push(
                and(
                    sql`1=1`,
                    sql`(${topupPackages.package_name} IS NOT NULL OR ${topupPackages.api_package_name} IS NOT NULL)`
                )
            );
            conditions.push(
                sql`(
                    ${topupPackages.package_name} LIKE ${`%${keyword}%`}
                    OR ${topupPackages.api_package_name} LIKE ${`%${keyword}%`}
                    OR ${topupPackages.custom_package_name} LIKE ${`%${keyword}%`}
                )`
            );
        }

        if (game_id) {
            conditions.push(eq(topupPackages.game_id, game_id));
        }
        if (id_server !== null && id_server !== undefined && id_server !== "") {
            conditions.push(eq(topupPackages.id_server, normalizeBoolean(id_server, false)));
        }
        if (sale !== null && sale !== undefined && sale !== "") {
            conditions.push(eq(topupPackages.sale, normalizeBoolean(sale, false)));
        }

        const result = await db
            .select()
            .from(topupPackages)
            .where(and(...conditions))
            .orderBy(asc(topupPackages.origin_price));

        return result.map(hydratePackage);
    },

    getPackagePriceById: async (id) => {
        const [result] = await db
            .select({
                id: topupPackages.id,
                price: topupPackages.price,
                package_name: topupPackages.package_name,
                api_package_name: topupPackages.api_package_name,
                custom_package_name: topupPackages.custom_package_name,
            })
            .from(topupPackages)
            .where(eq(topupPackages.id, id));

        return hydratePackage(result || null);
    },

    getPackageProfitById: async (id) => {
        const [result] = await db
            .select({
                profit: sql`(${topupPackages.price} - ${topupPackages.origin_price})`,
            })
            .from(topupPackages)
            .where(eq(topupPackages.id, id));

        return result ? result.profit : null;
    },

    getPackageAmountById: async (id) => {
        const [result] = await db
            .select({ price: topupPackages.price })
            .from(topupPackages)
            .where(eq(topupPackages.id, id));

        return result ? result.price : null;
    },

    getPackagesByGameSlug: async (game_code, id_server = null) => {
        return await PackageService.getPackagesByGameCode(game_code, id_server);
    },

    deletePackage: async (id) => {
        return await PackageService.delPackages(id);
    },

    updateStatus: async (id, newStatus) => {
        return await PackageService.patchPackage(id, newStatus);
    },

    updateSale: async (id, sale) => {
        await db
            .update(topupPackages)
            .set({ sale: normalizeBoolean(sale, false) })
            .where(eq(topupPackages.id, id));

        return await PackageService.getPackageById(id);
    },

    getLogTypePackages: async () => {
        return await PackageService.getAllPackages();
    },
};

module.exports = PackageService;
