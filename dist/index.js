"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const supabase_1 = require("./lib/supabase");
const env_1 = require("./config/env");
const eventService_1 = require("./services/eventService");
// Note: The punycode deprecation warning [DEP0040] is coming from a dependency
// and can be ignored for now. It's a Node.js internal module that's being deprecated.
// See: https://nodejs.org/api/deprecations.html#DEP0040
// Validate required environment variables
(0, env_1.validateEnv)();
const app = (0, express_1.default)();
const port = env_1.env.PORT;
// Middleware
// Configure CORS
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
    optionsSuccessStatus: 204
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Routes
app.get("/", (req, res) => {
    res.send("Express + TypeScript Server");
});
// Login endpoint
app.post("/api/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        // Authenticate with Supabase
        const { data, error } = yield supabase_1.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            return res.status(401).json({ error: error.message });
        }
        // Set cookies
        res.cookie("token", data.session.access_token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        res.cookie("is-logged", "true", {
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        return res.status(200).json({
            message: "Login successfully",
            user: data.user
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}));
// MMA Events API endpoints
// Create a new event
app.post("/api/events", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventData = req.body;
        // Validate required fields
        if (!eventData.name || !eventData.date || !eventData.location || !eventData.bouts) {
            return res.status(400).json({ error: "Missing required event data" });
        }
        const event = yield eventService_1.eventService.createEvent(eventData);
        if (!event) {
            return res.status(500).json({ error: "Failed to create event" });
        }
        return res.status(201).json(event);
    }
    catch (error) {
        console.error("Create event error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}));
// Get all events
app.get("/api/events", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = yield eventService_1.eventService.getAllEvents();
        return res.status(200).json(events);
    }
    catch (error) {
        console.error("Get events error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}));
// Get event by ID
app.get("/api/events/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "Event ID is required" });
        }
        const event = yield eventService_1.eventService.getEventById(id);
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        return res.status(200).json(event);
    }
    catch (error) {
        console.error("Get event error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}));
// Update event
app.put("/api/events/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const eventData = req.body;
        if (!id) {
            return res.status(400).json({ error: "Event ID is required" });
        }
        const event = yield eventService_1.eventService.updateEvent(id, eventData);
        if (!event) {
            return res.status(404).json({ error: "Event not found or update failed" });
        }
        return res.status(200).json(event);
    }
    catch (error) {
        console.error("Update event error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}));
// Delete event
app.delete("/api/events/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "Event ID is required" });
        }
        const success = yield eventService_1.eventService.deleteEvent(id);
        if (!success) {
            return res.status(404).json({ error: "Event not found or delete failed" });
        }
        return res.status(204).send();
    }
    catch (error) {
        console.error("Delete event error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}));
// Function to start the server with port fallback
const startServer = (initialPort) => {
    const server = app.listen(initialPort, () => {
        console.log(`[server]: Server is running at http://localhost:${initialPort}`);
    });
    // Handle server errors
    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`Port ${initialPort} is already in use, trying ${Number(initialPort) + 1}...`);
            // Try the next port
            startServer(Number(initialPort) + 1);
        }
        else {
            console.error('Server error:', e);
        }
    });
};
// Start the server with the configured port
startServer(port);
