-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fighters table
CREATE TABLE IF NOT EXISTS fighters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bouts table
CREATE TABLE IF NOT EXISTS bouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  fighter_left_id UUID NOT NULL REFERENCES fighters(id) ON DELETE CASCADE,
  fighter_right_id UUID NOT NULL REFERENCES fighters(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bet_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS bet_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bout_results table
CREATE TABLE IF NOT EXISTS bout_results (
  bout_id UUID NOT NULL,
  winner_id UUID,
  bet_type_id INTEGER,
  round INTEGER,
  time TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (bout_id),
  CONSTRAINT fk_bout
    FOREIGN KEY (bout_id)
    REFERENCES bouts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_winner
    FOREIGN KEY (winner_id)
    REFERENCES fighters(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_bet_type
    FOREIGN KEY (bet_type_id)
    REFERENCES bet_types(id)
    ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bouts_event_id ON bouts(event_id);
CREATE INDEX IF NOT EXISTS idx_bouts_fighter_left_id ON bouts(fighter_left_id);
CREATE INDEX IF NOT EXISTS idx_bouts_fighter_right_id ON bouts(fighter_right_id);
CREATE INDEX IF NOT EXISTS idx_bout_results_winner_id ON bout_results(winner_id);
CREATE INDEX IF NOT EXISTS idx_bout_results_bet_type_id ON bout_results(bet_type_id);
