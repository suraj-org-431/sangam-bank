import AccountCharge from '../models/AccountCharge.js';

export const addAccountCharge = async (req, res) => {
    try {
        const { accountId, type, label, amount, notes } = req.body;

        const charge = await AccountCharge.create({
            accountId,
            type,
            label,
            amount,
            notes,
            createdBy: req.user?._id,
        });

        res.status(201).json({ success: true, data: charge });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error saving charge', error: err });
    }
};


export const getChargesByAccount = async (req, res) => {
    try {
        const charges = await AccountCharge.find({ accountId: req.params.accountId }).sort({ chargedDate: -1 });
        res.json(charges);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch charges' });
    }
};