import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
    type: { type: String, default: 'account' },
    title: String,
    body: String,
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Notification', notificationSchema);
