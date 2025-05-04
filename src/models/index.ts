// MMA Event interfaces

// Interface for a fighter in a bout
export interface Fighter {
  name: string;
  record: string;
}

// Interface for a bout/fight
export interface Bout {
  id?: string;
  event_id: string;
  left_fighter: string;
  left_record: string;
  right_fighter: string;
  right_record: string;
  created_at?: string;
  updated_at?: string;
}

// Interface for an MMA event
export interface Event {
  id?: string;
  name: string;
  date: string;
  location: string;
  bouts?: Bout[];
  created_at?: string;
  updated_at?: string;
}

// Interface for the data received from the web scraping script
export interface ScrapedEventData {
  name: string;
  date: string;
  location: string;
  bouts: {
    left_fighter: string;
    left_record: string;
    right_fighter: string;
    right_record: string;
  }[];
}