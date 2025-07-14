import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import path from "path";
import cron from 'node-cron';

// Load environment variables
dotenv.config();

// Internal imports
import "./config/passport.js";
import { sendEmail } from "./utils/email.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import googleRoutes from "./routes/googleAuthRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import permissionRoutes from "./routes/permissionRoute.js";
import routeRoutes from "./routes/routeRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";
import pageRoutes from "./routes/pageRoutes.js";
import notificationRoutes from "./routes/notificationsRoutes.js";
import messageRoutes from "./routes/messagesRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import loanRoutes from './routes/loanRoutes.js';
import configRoutes from './routes/configRoutes.js';
import { applyInterestToAllAccounts } from "./utils/interestService.js";

// Initialize app
const app = express();

// ====================
// ✅ Middleware Setup
// ====================

// CORS setup
const corsOptions = {
    origin: "http://localhost:3000", // frontend origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight

// JSON and URL encoded body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // useful for fallback

// Session management
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Passport auth
app.use(passport.initialize());
app.use(passport.session());

// Static file serving for uploaded profile pictures
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/uploads/profilePics', express.static(path.join(process.cwd(), 'uploads/profilePics')));

// ====================
// ✅ MongoDB Connection
// ====================
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// ====================
// ✅ Routes
// ====================
app.use("/api/auth", authRoutes);
app.use("/api/auth/google", googleRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/transactions", transactionRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/config', configRoutes);

// ✅ Test Email Route
app.get('/api/test-email', async (req, res) => {
    try {
        await sendEmail({
            to: 'srjkmr431@gmail.com',
            subject: 'Test Email from Nodemailer',
            html: `<h2>Hello from localhost 👋</h2><p>This is a test email sent from Node.js app on localhost using Gmail.</p>`
        });
        res.send("✅ Email sent!");
    } catch (err) {
        console.error("❌ Email sending failed:", err);
        res.status(500).send("❌ Failed to send email.");
    }
});

// ✅ Fallback route for undefined API routes
app.all("/api/*", (req, res) => {
    res.status(404).json({ message: "API route not found." });
});


// cron.js or server.js
cron.schedule('0 0 1 * *', async () => {
    console.log('✅ Running monthly interest task...');
    try {
        const result = await applyInterestToAllAccounts();
        console.log(`✔️ Interest applied to ${result.appliedTo} accounts`);
    } catch (err) {
        console.error('❌ Interest cron failed:', err.message);
    }
});
// ====================
// ✅ Start Server
// ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

export default app;
