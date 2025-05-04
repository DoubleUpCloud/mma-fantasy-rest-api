import { supabase } from '../lib/supabase';
import { Event, Bout, ScrapedEventData } from '../models';

/**
 * Service for handling MMA event operations
 */
export const eventService = {
  /**
   * Create a new MMA event with its bouts
   * @param eventData The event data from the scraping script
   * @returns The created event with its bouts
   */
  async createEvent(eventData: ScrapedEventData): Promise<Event | null> {
    try {
      // Insert the event
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

      // Insert the bouts
      if (eventData.bouts && eventData.bouts.length > 0) {
        const boutsToInsert = eventData.bouts.map(bout => ({
          event_id: event.id,
          left_fighter: bout.left_fighter,
          left_record: bout.left_record,
          right_fighter: bout.right_fighter,
          right_record: bout.right_record,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

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
   * Get an MMA event by ID with its bouts
   * @param id The event ID
   * @returns The event with its bouts
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

      // Get the bouts for this event
      const { data: bouts, error: boutsError } = await supabase
        .from('bouts')
        .select('*')
        .eq('event_id', id)
        .order('id');

      if (boutsError) {
        console.error('Error getting bouts:', boutsError);
        // Even if getting bouts fails, we return the event
      }

      // Add bouts to the event object
      event.bouts = bouts || [];

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
  }
};