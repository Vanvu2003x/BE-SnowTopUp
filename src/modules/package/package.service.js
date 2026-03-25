const { db } = require("../../configs/drizzle");
const { topupPackages, games } = require("../../db/schema");
const { eq, and, ilike, asc, desc, sql, like } = require("drizzle-orm");
const crypto = require("crypto");
const { deleteFile } = require("../../utils/file.util");

const PackageService = {
    getAllPackages: async () => {
        return await db.select().from(topupPackages).orderBy(asc(topupPackages.price));
    },

    getPackageById: async (id) => {
        const [result] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        return result || null;
    },

    /**
     * Get packages by game code - SIMPLIFIED VERSION
     * Returns all price tiers, FE will handle display based on user level
     */
    getPackagesByGameCode: async (game_code, id_server = null) => {
        const conditions = [
            eq(games.gamecode, game_code),
            eq(topupPackages.status, 'active') // Only return active packages
        ];

        if (id_server) {
            conditions.push(eq(topupPackages.id_server, id_server));
        }

        const packages = await db.select({
            id: topupPackages.id,
            api_id: topupPackages.api_id,
            package_name: topupPackages.package_name,
            game_id: topupPackages.game_id,
            // Return ALL prices - FE will choose based on user level
            price: topupPackages.price,
            price_basic: topupPackages.price_basic,
            price_pro: topupPackages.price_pro,
            price_plus: topupPackages.price_plus,
            origin_price: topupPackages.origin_price,
            thumbnail: topupPackages.thumbnail,
            package_type: topupPackages.package_type,
            status: topupPackages.status,
            fileAPI: topupPackages.fileAPI,
            id_server: topupPackages.id_server,
            sale: topupPackages.sale
        })
            .from(topupPackages)
            .innerJoin(games, eq(topupPackages.game_id, games.id))
            .where(and(...conditions))
            .orderBy(asc(topupPackages.price_basic)); // Sort by basic price

        return packages;
    },

    createPackage: async (data, file) => {
        let parsedFileAPI = null;
        if (data.fileAPI) {
            try {
                parsedFileAPI = typeof data.fileAPI === 'string' ? JSON.parse(data.fileAPI) : data.fileAPI;
            } catch (error) {
                console.error("Invalid JSON in fileAPI:", error.message);
                parsedFileAPI = null;
            }
        }

        // Handle File
        let thumbnailPath = data.thumbnail;
        if (file) {
            thumbnailPath = file.path;
        }

        // Fetch Game Settings for Pricing
        const [game] = await db.select().from(games).where(eq(games.id, data.game_id));
        if (!game) throw { status: 404, message: "Game not found" };

        const originPrice = parseInt(data.origin_price || 0);

        // The frontend now sends explicit final prices via the 'profit_percent_' payload properties
        // to avoid DB migration. So 'profit_percent_X' holds the EXACT ABSOLUTE FINAL PRICE.
        const priceBasic = data.profit_percent_basic !== undefined ? Number(data.profit_percent_basic) : originPrice;
        const pricePro = data.profit_percent_pro !== undefined ? Number(data.profit_percent_pro) : originPrice;
        const pricePlus = data.profit_percent_plus !== undefined ? Number(data.profit_percent_plus) : originPrice;
        const priceUser = data.profit_percent_user !== undefined ? Number(data.profit_percent_user) : 0;

        const newPackage = {
            id: crypto.randomUUID(),
            api_id: data.api_id, // Store external ID
            package_name: data.package_name,
            game_id: data.game_id,
            origin_price: originPrice,

            profit_percent_basic: percentBasic,
            profit_percent_pro: percentPro,
            profit_percent_plus: percentPlus,
            profit_percent_user: percentUser,

            price: priceUser > originPrice ? priceUser : priceBasic, // Default price logic: Use User price if valid calculation, else Basic
            price_basic: priceBasic,
            price_pro: pricePro,
            price_plus: pricePlus,

            thumbnail: thumbnailPath,
            package_type: data.package_type,
            id_server: data.id_server,
            sale: data.sale || false,
            fileAPI: parsedFileAPI,
        };

        await db.insert(topupPackages).values(newPackage);
        const [created] = await db.select().from(topupPackages).where(eq(topupPackages.id, newPackage.id));
        return created;
    },

    patchPackage: async (id, newStatus) => {
        await db.update(topupPackages)
            .set({ status: newStatus })
            .where(eq(topupPackages.id, id));
        const [updated] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        return updated;
    },

    updatePackage: async (id, data, file) => {
        const currentPkg = await PackageService.getPackageById(id);
        if (!currentPkg) throw { status: 404, message: "Gói không tồn tại" };

        // Fetch Game to get current percentages
        const [game] = await db.select().from(games).where(eq(games.id, currentPkg.game_id));
        if (!game) throw { status: 404, message: "Game associated with this package not found" };

        const updateData = {};
        if (data.package_name !== undefined) updateData.package_name = data.package_name;
        if (data.api_id !== undefined) updateData.api_id = data.api_id;
        if (data.package_type !== undefined) updateData.package_type = data.package_type;
        if (data.id_server !== undefined) updateData.id_server = data.id_server;
        if (data.sale !== undefined) updateData.sale = data.sale;
        if (data.status !== undefined) updateData.status = data.status;

        // Pricing Logic
        const originPrice = data.origin_price !== undefined ? parseInt(data.origin_price) : currentPkg.origin_price;

        const percentBasic = data.profit_percent_basic !== undefined ? Number(data.profit_percent_basic)
            : (currentPkg.profit_percent_basic !== null ? currentPkg.profit_percent_basic : (game.profit_percent_basic || 0));

        const percentPro = data.profit_percent_pro !== undefined ? Number(data.profit_percent_pro)
            : (currentPkg.profit_percent_pro !== null ? currentPkg.profit_percent_pro : (game.profit_percent_pro || 0));

        const percentPlus = data.profit_percent_plus !== undefined ? Number(data.profit_percent_plus)
            : (currentPkg.profit_percent_plus !== null ? currentPkg.profit_percent_plus : (game.profit_percent_plus || 0));

        const priceBasic = data.profit_percent_basic !== undefined ? Number(data.profit_percent_basic)
            : (currentPkg.price_basic !== null ? currentPkg.price_basic : originPrice);
        const pricePro = data.profit_percent_pro !== undefined ? Number(data.profit_percent_pro)
            : (currentPkg.price_pro !== null ? currentPkg.price_pro : originPrice);
        const pricePlus = data.profit_percent_plus !== undefined ? Number(data.profit_percent_plus)
            : (currentPkg.price_plus !== null ? currentPkg.price_plus : originPrice);
        const priceUser = data.profit_percent_user !== undefined ? Number(data.profit_percent_user)
            : 0;

        // Update stored values 
        updateData.origin_price = originPrice;
        updateData.profit_percent_basic = priceBasic;
        updateData.profit_percent_pro = pricePro;
        updateData.profit_percent_plus = pricePlus;
        updateData.profit_percent_user = priceUser;

        // Recalculate Prices
        updateData.price_basic = priceBasic;
        updateData.price_pro = pricePro;
        updateData.price_plus = pricePlus;
        updateData.price = priceUser > originPrice ? priceUser : priceBasic;

        // Thumbnail
        if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
        let oldThumbnailToDelete = null;
        if (file) {
            updateData.thumbnail = file.path;
            if (currentPkg.thumbnail) {
                oldThumbnailToDelete = currentPkg.thumbnail;
            }
        }

        // FileAPI
        if (data.fileAPI !== undefined) {
            try {
                updateData.fileAPI = typeof data.fileAPI === 'string' ? JSON.parse(data.fileAPI) : data.fileAPI;
            } catch (e) {
                updateData.fileAPI = null;
            }
        }

        if (Object.keys(updateData).length === 0) {
            throw { status: 400, message: "Không có dữ liệu nào để cập nhật" };
        }

        await db.update(topupPackages).set(updateData).where(eq(topupPackages.id, id));
        const [updated] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        if (oldThumbnailToDelete && oldThumbnailToDelete !== updated?.thumbnail) {
            deleteFile(oldThumbnailToDelete);
        }
        return updated;
    },

    getPackagesByType: async (type) => {
        return await db.select()
            .from(topupPackages)
            .where(eq(topupPackages.package_type, type))
            .orderBy(asc(topupPackages.price));
    },

    delPackages: async (id) => {
        const [deleted] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        await db.delete(topupPackages).where(eq(topupPackages.id, id));

        // Cleanup file
        if (deleted && deleted.thumbnail) {
            deleteFile(deleted.thumbnail);
        }

        return deleted;
    },

    searchPackages: async ({ keyword = "", game_id = null, id_server = null, sale = null }) => {
        let conditions = [sql`1=1`]; // Base true condition

        if (keyword) {
            conditions.push(ilike(topupPackages.package_name, `%${keyword}%`));
        }
        if (game_id) {
            conditions.push(eq(topupPackages.game_id, game_id));
        }
        if (id_server !== null) {
            conditions.push(eq(topupPackages.id_server, id_server));
        }
        if (sale !== null) {
            conditions.push(eq(topupPackages.sale, sale));
        }

        return await db.select()
            .from(topupPackages)
            .where(and(...conditions))
            .orderBy(asc(topupPackages.price));
    },

    getPackagePriceById: async (id) => {
        const [result] = await db.select({ id: topupPackages.id, price: topupPackages.price, package_name: topupPackages.package_name }).from(topupPackages).where(eq(topupPackages.id, id));
        return result || null;
    },

    getPackageProfitById: async (id) => {
        const [result] = await db.select({
            profit: sql`(${topupPackages.price} - ${topupPackages.origin_price})`
        }).from(topupPackages).where(eq(topupPackages.id, id));
        return result ? result.profit : null;
    },

    getPackageAmountById: async (id) => {
        const [result] = await db.select({ price: topupPackages.price }).from(topupPackages).where(eq(topupPackages.id, id));
        return result ? result.price : null;
    },
    // Aliases & Missing matches
    getPackagesByGameSlug: async (game_code, id_server = null) => {
        // reuse getPackagesByGameCode - simplified version
        return await PackageService.getPackagesByGameCode(game_code, id_server);
    },

    deletePackage: async (id) => {
        return await PackageService.delPackages(id);
    },

    updateStatus: async (id, newStatus) => {
        return await PackageService.patchPackage(id, newStatus);
    },

    updateSale: async (id, sale) => {
        await db.update(topupPackages)
            .set({ sale: sale })
            .where(eq(topupPackages.id, id));
        const [updated] = await db.select().from(topupPackages).where(eq(topupPackages.id, id));
        return updated;
    },

    getLogTypePackages: async () => {
        // Fallback implementation based on inferred intent
        return await PackageService.getAllPackages();
    }
};

module.exports = PackageService;
