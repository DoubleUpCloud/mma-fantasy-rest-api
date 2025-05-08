import express, { Express, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { supabase } from "./lib/supabase";
import { env, validateEnv } from "./config/env";
import { eventService } from "./services/eventService";
import { betService } from "./services/betService";
import { eventResultsService } from "./services/eventResultsService";
import { ScrapedEventData, BetType, UserBet, EventResults } from "./models";

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

// Search fighters by name
app.get("/api/fighters/search", async (req: Request, res: Response) => {
  try {
    const { name } = req.query;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: "Search term (name) is required" });
    }

    const fighters = await eventService.searchFightersByName(name);
    return res.status(200).json(fighters);
  } catch (error) {
    console.error("Search fighters error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all fighters
app.get("/api/fighters", async (req: Request, res: Response) => {
  try {
    const fighters = await eventService.getAllFighters();
    return res.status(200).json(fighters);
  } catch (error) {
    console.error("Get fighters error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Betting API endpoints

// Create a new bet type
app.post("/api/bet-types", async (req: Request, res: Response) => {
  try {
    const betTypeData: Omit<BetType, 'id' | 'created_at'> = req.body;

    // Validate required fields
    if (!betTypeData.name) {
      return res.status(400).json({ error: "Bet type name is required" });
    }

    const betType = await betService.createBetType(betTypeData);

    if (!betType) {
      return res.status(500).json({ error: "Failed to create bet type" });
    }

    return res.status(201).json(betType);
  } catch (error) {
    console.error("Create bet type error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all bet types
app.get("/api/bet-types", async (req: Request, res: Response) => {
  try {
    const betTypes = await betService.getAllBetTypes();
    return res.status(200).json(betTypes);
  } catch (error) {
    console.error("Get bet types error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get bet type by ID
app.get("/api/bet-types/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid bet type ID" });
    }

    const betType = await betService.getBetTypeById(id);

    if (!betType) {
      return res.status(404).json({ error: "Bet type not found" });
    }

    return res.status(200).json(betType);
  } catch (error) {
    console.error("Get bet type error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create a user bet
app.post("/api/user-bets", async (req: Request, res: Response) => {
  try {
    const userBetData: Omit<UserBet, 'created_at' | 'result'> = req.body;

    // Validate required fields
    if (!userBetData.user_id || !userBetData.bout_id || !userBetData.bet_type_id || !userBetData.predicted_value) {
      return res.status(400).json({ error: "Missing required bet data" });
    }

    const userBet = await betService.createUserBet(userBetData);

    if (!userBet) {
      return res.status(500).json({ error: "Failed to create user bet" });
    }

    return res.status(201).json(userBet);
  } catch (error) {
    console.error("Create user bet error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all bets for a user
app.get("/api/user-bets/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const userBets = await betService.getUserBets(userId);
    return res.status(200).json(userBets);
  } catch (error) {
    console.error("Get user bets error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get all bets for a bout
app.get("/api/bout-bets/:boutId", async (req: Request, res: Response) => {
  try {
    const boutId = parseInt(req.params.boutId);

    if (isNaN(boutId)) {
      return res.status(400).json({ error: "Invalid bout ID" });
    }

    const boutBets = await betService.getBoutBets(boutId);
    return res.status(200).json(boutBets);
  } catch (error) {
    console.error("Get bout bets error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Update bet result
app.put("/api/user-bets/result", async (req: Request, res: Response) => {
  try {
    const userBetData: Pick<UserBet, 'user_id' | 'bout_id' | 'bet_type_id' | 'result'> = req.body;

    // Validate required fields
    if (!userBetData.user_id || !userBetData.bout_id || !userBetData.bet_type_id || userBetData.result === undefined) {
      return res.status(400).json({ error: "Missing required bet data" });
    }

    const userBet = await betService.updateBetResult(userBetData);

    if (!userBet) {
      return res.status(404).json({ error: "User bet not found or update failed" });
    }

    return res.status(200).json(userBet);
  } catch (error) {
    console.error("Update bet result error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Add event results
app.post("/api/event-results", async (req: Request, res: Response) => {
  try {
    const eventResultsData: EventResults = req.body;

    // Validate required fields
    if (!eventResultsData.name || !eventResultsData.date || !eventResultsData.location || !eventResultsData.bout_results || !Array.isArray(eventResultsData.bout_results)) {
      return res.status(400).json({ error: "Missing required event results data" });
    }

    // Validate bout results
    for (const boutResult of eventResultsData.bout_results) {
      if (!boutResult.winner || !boutResult.loser || !boutResult.result) {
        return res.status(400).json({ error: "Missing required bout result data" });
      }
    }

    const success = await eventResultsService.addEventResults(eventResultsData);

    if (!success) {
      return res.status(500).json({ error: "Failed to add event results" });
    }

    return res.status(201).json({ message: "Event results added successfully" });
  } catch (error) {
    console.error("Add event results error:", error);
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
