import express, { Express, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { supabase } from "./lib/supabase";
import { env, validateEnv } from "./config/env";
import { eventService } from "./services/eventService";
import { ScrapedEventData } from "./models";

// Note: The punycode deprecation warning [DEP0040] is coming from a dependency
// and can be ignored for now. It's a Node.js internal module that's being deprecated.
// See: https://nodejs.org/api/deprecations.html#DEP0040

// Validate required environment variables
validateEnv();

const app: Express = express();
const port = env.PORT;

// Middleware
// Configure CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Length', 'X-Requested-With'],
  optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

// Login endpoint
app.post("/api/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
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
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// MMA Events API endpoints

// Create a new event
app.post("/api/events", async (req: Request, res: Response) => {
  try {
    const eventData: ScrapedEventData = req.body;

    // Validate required fields
    if (!eventData.name || !eventData.date || !eventData.location || !eventData.bouts) {
      return res.status(400).json({ error: "Missing required event data" });
    }

    const event = await eventService.createEvent(eventData);

    if (!event) {
      return res.status(500).json({ error: "Failed to create event" });
    }

    return res.status(201).json(event);
  } catch (error) {
    console.error("Create event error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all events
app.get("/api/events", async (req: Request, res: Response) => {
  try {
    const events = await eventService.getAllEvents();
    return res.status(200).json(events);
  } catch (error) {
    console.error("Get events error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get event by ID
app.get("/api/events/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    const event = await eventService.getEventById(id);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    return res.status(200).json(event);
  } catch (error) {
    console.error("Get event error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update event
app.put("/api/events/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const eventData = req.body;

    if (!id) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    const event = await eventService.updateEvent(id, eventData);

    if (!event) {
      return res.status(404).json({ error: "Event not found or update failed" });
    }

    return res.status(200).json(event);
  } catch (error) {
    console.error("Update event error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Delete event
app.delete("/api/events/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    const success = await eventService.deleteEvent(id);

    if (!success) {
      return res.status(404).json({ error: "Event not found or delete failed" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Delete event error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Function to start the server with port fallback
const startServer = (initialPort: string | number) => {
  const server = app.listen(initialPort, () => {
    console.log(`[server]: Server is running at http://localhost:${initialPort}`);
  });

  // Handle server errors
  server.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${initialPort} is already in use, trying ${Number(initialPort) + 1}...`);
      // Try the next port
      startServer(Number(initialPort) + 1);
    } else {
      console.error('Server error:', e);
    }
  });
};

// Start the server with the configured port
startServer(port);
