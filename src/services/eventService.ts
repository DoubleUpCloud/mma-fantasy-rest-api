import { supabase } from '../lib/supabase';
import { Event, Bout, ScrapedEventData, FighterRecord } from '../models';
import { eventResultsService } from './eventResultsService';

/**
 * Parse a fighter record string (e.g., "10-2-1") into wins, losses, and draws
 * @param record The record string in format "wins-losses-draws"
 * @returns Object with wins, losses, and draws as numbers
 */
const parseRecord = (record: string): { wins: number; losses: number; draws: number } => {
  // Default values
  const result = { wins: 0, losses: 0, draws: 0 };

  // Handle empty or invalid records
  if (!record) return result;

  // Parse the record string
  const parts = record.split('-');

  if (parts.length >= 1) result.wins = parseInt(parts[0]) || 0;
  if (parts.length >= 2) result.losses = parseInt(parts[1]) || 0;
  if (parts.length >= 3) result.draws = parseInt(parts[2]) || 0;

  return result;
};

/**
 * Service for handling MMA event operations
 */
export const eventService = {
  /**
   * Create or update a fighter in the database
   * @param name The fighter's name
   * @param record The fighter's record string (e.g., "10-2-1")
   * @returns The fighter record object with ID
   */
  async createOrUpdateFighter(name: string, record: string): Promise<FighterRecord | null> {
    try {
      // First, check if the fighter already exists
      const { data: existingFighter, error: searchError } = await supabase
        .from('fighters')
        .select('*')
        .eq('name', name)
        .maybeSingle();

      if (searchError) {
        console.error('Error searching for fighter:', searchError);
        return null;
      }

      const recordData = parseRecord(record);
      const timestamp = new Date().toISOString();

      if (existingFighter) {
        // Update the existing fighter
        const { data: updatedFighter, error: updateError } = await supabase
          .from('fighters')
          .update({
            wins: recordData.wins,
            losses: recordData.losses,
            draws: recordData.draws,
            updated_at: timestamp
          })
          .eq('id', existingFighter.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating fighter:', updateError);
          return existingFighter; // Return the existing fighter even if update fails
        }

        return updatedFighter;
      } else {
        // Create a new fighter
        const { data: newFighter, error: insertError } = await supabase
          .from('fighters')
          .insert({
            name,
            wins: recordData.wins,
            losses: recordData.losses,
            draws: recordData.draws,
            created_at: timestamp,
            updated_at: timestamp
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating fighter:', insertError);
          return null;
        }

        return newFighter;
      }
    } catch (error) {
      console.error('Error in createOrUpdateFighter:', error);
      return null;
    }
  },

  /**
   * Create a new MMA event with its bouts
   * @param eventData The event data from the scraping script
   * @returns The created event with its bouts
   */
  async createEvent(eventData: ScrapedEventData): Promise<Event | null> {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          name: eventData.name,
          date: eventData.date,
          location: eventData.location,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (eventError) {
        console.error('Error creating event:', eventError);
        return null;
      }

      if (eventData.bouts && eventData.bouts.length > 0) {
        // Process each bout
        const boutsPromises = eventData.bouts.map(async (bout: {
          left_fighter: string;
          left_record: string;
          right_fighter: string;
          right_record: string;
        }) => {
          // Create or update fighters
          console.log(eventData);
          console.log(bout)
          const leftFighter = await this.createOrUpdateFighter(bout.left_fighter, bout.left_record);
          const rightFighter = await this.createOrUpdateFighter(bout.right_fighter, bout.right_record);

          if (!leftFighter || !rightFighter) {
            console.error('Failed to create or update fighters for bout');
            return null;
          }

          // Create bout with fighter IDs
          return {
            event_id: event.id,
            fighter_left_id: leftFighter.id,
            fighter_right_id: rightFighter.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        // Wait for all fighter processing to complete
        const boutsToInsert = (await Promise.all(boutsPromises)).filter(bout => bout !== null);

        if (boutsToInsert.length > 0) {
          const { data: bouts, error: boutsError } = await supabase
            .from('bouts')
            .insert(boutsToInsert)
            .select();

          if (boutsError) {
            console.error('Error creating bouts:', boutsError);
            // Even if bouts creation fails, we return the event
          }

          // Add bouts to the event object
          event.bouts = bouts || [];
        }
      }

      return event;
    } catch (error) {
      console.error('Error in createEvent:', error);
      return null;
    }
  },

  /**
   * Get all MMA events
   * @returns Array of events
   */
  async getAllEvents(): Promise<Event[]> {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error getting events:', error);
        return [];
      }

      return events || [];
    } catch (error) {
      console.error('Error in getAllEvents:', error);
      return [];
    }
  },

  /**
   * Get an MMA event by ID with its bouts and fighter information
   * @param id The event ID
   * @returns The event with its bouts and fighter information
   */
  async getEventById(id: string): Promise<Event | null> {
    try {
      // Get the event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventError) {
        console.error('Error getting event:', eventError);
        return null;
      }

      // Get the bouts for this event with fighter information
      const { data: bouts, error: boutsError } = await supabase
        .from('bouts')
        .select(`
          *,
          fighter_left:fighters!fighter_left_id(*),
          fighter_right:fighters!fighter_right_id(*)
        `)
        .eq('event_id', id)
        .order('id');

      if (boutsError) {
        console.error('Error getting bouts:', boutsError);
        // Even if getting bouts fails, we return the event
      }

      // Process bouts to include fighter information in a more accessible format
      if (bouts) {
        const processedBouts = bouts.map((bout: any) => {
          const leftFighter = bout.fighter_left;
          const rightFighter = bout.fighter_right;

          return {
            id: bout.id,
            event_id: bout.event_id,
            fighter_left_id: bout.fighter_left_id,
            fighter_right_id: bout.fighter_right_id,
            left_fighter: leftFighter ? leftFighter.name : 'Unknown',
            right_fighter: rightFighter ? rightFighter.name : 'Unknown',
            left_record: leftFighter ? `${leftFighter.wins}-${leftFighter.losses}-${leftFighter.draws}` : '0-0-0',
            right_record: rightFighter ? `${rightFighter.wins}-${rightFighter.losses}-${rightFighter.draws}` : '0-0-0',
            created_at: bout.created_at,
            updated_at: bout.updated_at
          };
        });

        // Add processed bouts to the event object
        event.bouts = processedBouts;
      } else {
        event.bouts = [];
      }

      // Check if the event date is earlier than today
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to beginning of day for accurate comparison

      if (eventDate < today) {
        // Event is in the past, fetch fight results
        const boutResults = await eventResultsService.getBoutResultsByEventId(id);

        if (boutResults && boutResults.length > 0) {
          // Create a map of bout_id to result for easy lookup
          const boutResultsMap = new Map();
          boutResults.forEach((result: any) => {
            boutResultsMap.set(result.bout_id, result);
          });

          // Add results to each bout
          if (event.bouts) {
            // Create an array of promises to fetch the latest fighter records
            const boutsWithUpdatedRecordsPromises = event.bouts.map(async (bout: Bout) => {
              const result = boutResultsMap.get(bout.id);

              // Fetch the latest fighter records
              const leftFighter = await this.getFighterById(bout.fighter_left_id);
              const rightFighter = await this.getFighterById(bout.fighter_right_id);

              // Update the fighter records in the bout
              const updatedBout = {
                ...bout,
                left_record: leftFighter ? `${leftFighter.wins}-${leftFighter.losses}-${leftFighter.draws}` : '0-0-0',
                right_record: rightFighter ? `${rightFighter.wins}-${rightFighter.losses}-${rightFighter.draws}` : '0-0-0'
              };

              // Add result information if available
              if (result) {
                return {
                  ...updatedBout,
                  result: {
                    winner_id: result.winner_id,
                    winner_name: result.winner?.name || 'Unknown',
                    bet_type: result.bet_type?.name || 'Unknown',
                    round: result.round,
                    time: result.time,
                    details: result.details
                  }
                };
              }

              return updatedBout;
            });

            // Wait for all promises to resolve
            event.bouts = await Promise.all(boutsWithUpdatedRecordsPromises);
          }
        }
      }

      return event;
    } catch (error) {
      console.error('Error in getEventById:', error);
      return null;
    }
  },

  /**
   * Update an MMA event
   * @param id The event ID
   * @param eventData The updated event data
   * @returns The updated event
   */
  async updateEvent(id: string, eventData: Partial<Event>): Promise<Event | null> {
    try {
      const { data: event, error } = await supabase
        .from('events')
        .update({
          ...eventData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', error);
        return null;
      }

      return event;
    } catch (error) {
      console.error('Error in updateEvent:', error);
      return null;
    }
  },

  /**
   * Delete an MMA event and its bouts
   * @param id The event ID
   * @returns True if successful, false otherwise
   */
  async deleteEvent(id: string): Promise<boolean> {
    try {
      // Delete the bouts first (due to foreign key constraint)
      // Note: We don't delete fighters as they may be referenced by other bouts
      const { error: boutsError } = await supabase
        .from('bouts')
        .delete()
        .eq('event_id', id);

      if (boutsError) {
        console.error('Error deleting bouts:', boutsError);
        return false;
      }

      // Delete the event
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (eventError) {
        console.error('Error deleting event:', eventError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteEvent:', error);
      return false;
    }
  },

  /**
   * Get a fighter by ID
   * @param id The fighter ID
   * @returns The fighter record
   */
  async getFighterById(id: string): Promise<FighterRecord | null> {
    try {
      const { data: fighter, error } = await supabase
        .from('fighters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error getting fighter:', error);
        return null;
      }

      return fighter;
    } catch (error) {
      console.error('Error in getFighterById:', error);
      return null;
    }
  },

  /**
   * Get all fighters
   * @returns Array of fighter records
   */
  async getAllFighters(): Promise<FighterRecord[]> {
    try {
      const { data: fighters, error } = await supabase
        .from('fighters')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error getting fighters:', error);
        return [];
      }

      return fighters || [];
    } catch (error) {
      console.error('Error in getAllFighters:', error);
      return [];
    }
  },

  /**
   * Search fighters by name
   * @param searchTerm The search term to match against fighter names
   * @returns Array of fighter records matching the search term
   */
  async searchFightersByName(searchTerm: string): Promise<FighterRecord[]> {
    try {
      const { data: fighters, error } = await supabase
        .from('fighters')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('name');

      if (error) {
        console.error('Error searching fighters:', error);
        return [];
      }

      return fighters || [];
    } catch (error) {
      console.error('Error in searchFightersByName:', error);
      return [];
    }
  }
};
