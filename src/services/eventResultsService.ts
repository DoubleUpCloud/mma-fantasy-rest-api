import { supabase } from '../lib/supabase';
import { EventResults, BoutResult } from '../models';
import { eventService } from './eventService';

/**
 * Service for handling event results operations
 */
export const eventResultsService = {
  /**
   * Add event results to the database
   * @param eventResults The event results data
   * @returns True if successful, false otherwise
   */
  async addEventResults(eventResults: EventResults): Promise<boolean> {
    try {
      // First, check if the event exists
      const { data: existingEvents, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('name', eventResults.name)
        .maybeSingle();

      if (eventError) {
        console.error('Error checking for existing event:', eventError);
        return false;
      }

      let eventId: string;

      // If the event doesn't exist, create it
      if (!existingEvents) {
        const event = await eventService.createEvent({
          name: eventResults.name,
          date: eventResults.date,
          location: eventResults.location,
          bouts: []
        });

        if (!event || !event.id) {
          console.error('Failed to create event');
          return false;
        }

        eventId = event.id;
      } else {
        eventId = existingEvents.id;
      }

      // Process each bout result
      for (const boutResult of eventResults.bout_results) {
        // Extract fighter names
        const winnerName = boutResult.winner.trim();
        const loserName = boutResult.loser.trim().replace(/\nL$/, ''); // Remove the 'L' suffix if present

        // Get or create fighters
        const winner = await eventService.createOrUpdateFighter(winnerName, '');
        const loser = await eventService.createOrUpdateFighter(loserName, '');

        if (!winner || !loser) {
          console.error('Failed to create or update fighters');
          continue; // Skip this bout but continue with others
        }

        // Check if the bout exists
        const { data: existingBouts, error: boutError } = await supabase
          .from('bouts')
          .select('id')
          .eq('event_id', eventId)
          .eq('fighter_left_id', winner.id)
          .eq('fighter_right_id', loser.id)
          .maybeSingle();

        if (boutError) {
          console.error('Error checking for existing bout:', boutError);
          continue;
        }

        let boutId: string;

        // If the bout doesn't exist, create it
        if (!existingBouts) {
          const { data: newBout, error: createBoutError } = await supabase
            .from('bouts')
            .insert({
              event_id: eventId,
              fighter_left_id: winner.id,
              fighter_right_id: loser.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createBoutError || !newBout) {
            console.error('Error creating bout:', createBoutError);
            continue;
          }

          boutId = newBout.id;
        } else {
          boutId = existingBouts.id;
        }

        // Parse the result
        const resultInfo = this.parseResultString(boutResult.result);

        // Check if bet_type exists for the result type
        const { data: betType, error: betTypeError } = await supabase
          .from('bet_types')
          .select('id')
          .eq('name', resultInfo.betType)
          .maybeSingle();

        if (betTypeError) {
          console.error('Error checking for bet type:', betTypeError);
          continue;
        }

        let betTypeId: number;

        // If the bet type doesn't exist, create it
        if (!betType) {
          const { data: newBetType, error: createBetTypeError } = await supabase
            .from('bet_types')
            .insert({
              name: resultInfo.betType,
              description: `Result type: ${resultInfo.betType}`,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createBetTypeError || !newBetType) {
            console.error('Error creating bet type:', createBetTypeError);
            continue;
          }

          betTypeId = newBetType.id;
        } else {
          betTypeId = betType.id;
        }

        // Create the bout result
        const { error: boutResultError } = await supabase
          .from('bout_results')
          .insert({
            bout_id: boutId,
            winner_id: winner.id,
            bet_type_id: betTypeId,
            round: resultInfo.round,
            time: resultInfo.time,
            details: boutResult.result,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (boutResultError) {
          console.error('Error creating bout result:', boutResultError);
          continue;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in addEventResults:', error);
      return false;
    }
  },

  /**
   * Parse the result string to extract bet type, round, and time
   * @param resultString The result string (e.g., "KO/TKO, 0:51 R2" or "Split Dec")
   * @returns Object with bet type, round, and time
   */
  parseResultString(resultString: string): { betType: string; round: number; time: string } {
    // Default values
    const result = { betType: 'Decision', round: 0, time: '' };

    if (!resultString) return result;

    // Check for KO/TKO
    if (resultString.includes('KO/TKO')) {
      result.betType = 'KO/TKO';
      
      // Extract round and time
      const match = resultString.match(/(\d+):(\d+)\s*R(\d+)/);
      if (match) {
        result.round = parseInt(match[3]) || 0;
        result.time = `${match[1]}:${match[2]}`;
      }
    } 
    // Check for Decision types
    else if (resultString.includes('Dec')) {
      if (resultString.includes('Split')) {
        result.betType = 'Split Decision';
      } else if (resultString.includes('Unanimous')) {
        result.betType = 'Unanimous Decision';
      } else {
        result.betType = 'Decision';
      }
    }
    // Add more result types as needed
    
    return result;
  }
};