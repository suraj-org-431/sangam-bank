import Config from '../models/Config.js';
import { successResponse, errorResponse, badRequestResponse } from '../utils/response.js';

// 🔍 Get config
export const getConfig = async (req, res) => {
    try {
        const config = await Config.findOne() || await Config.create({});
        return successResponse(res, 200, 'Config fetched', config);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to fetch config', err.message);
    }
};

// ✏️ Update config
export const updateConfig = async (req, res) => {
    try {
        const updates = req.body;

        let config = await Config.findOne();
        if (!config) config = new Config();

        Object.assign(config, updates);
        config.updatedAt = new Date();
        await config.save();

        return successResponse(res, 200, 'Config updated successfully', config);
    } catch (err) {
        return errorResponse(res, 500, 'Failed to update config', err.message);
    }
};
