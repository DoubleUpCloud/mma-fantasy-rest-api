import { supabase } from '../lib/supabase';
import { BetType, UserBet } from '../models';

/**
 * Service for handling betting operations
 */
export const betService = {
  /**
   * Create a new bet type
   * @param betType The bet type data
   * @returns The created bet type
   */
  async createBetType(betType: Omit<BetType, 'id' | 'created_at'>): Promise<BetType | null> {
    try {
      const { data, error } = await supabase
        .from('bet_types')
        .insert({
          name: betType.name,
          description: betType.description,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating bet type:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createBetType:', error);
      return null;
    }
  },

  /**
   * Get all bet types
   * @returns Array of bet types
   */
  async getAllBetTypes(): Promise<BetType[]> {
    try {
      const { data, error } = await supabase
        .from('bet_types')
        .select('*')
        .order('id');

      if (error) {
        console.error('Error getting bet types:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllBetTypes:', error);
      return [];
    }
  },

  /**
   * Get a bet type by ID
   * @param id The bet type ID
   * @returns The bet type
   */
  async getBetTypeById(id: number): Promise<BetType | null> {
    try {
      const { data, error } = await supabase
        .from('bet_types')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error getting bet type:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getBetTypeById:', error);
      return null;
    }
  },

  /**
   * Create a new user bet
   * @param userBet The user bet data
   * @returns The created user bet
   */
  async createUserBet(userBet: Omit<UserBet, 'created_at'>): Promise<UserBet | null> {
    try {
      const { data: existingBet, error: checkError } = await supabase
        .from('user_bets')
        .select('*')
        .eq('user_id', userBet.user_id)
        .eq('bout_id', userBet.bout_id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing bet:', checkError);
        return null;
      }

      if (existingBet) {
        const { data: updatedBet, error: updateError } = await supabase
          .from('user_bets')
          .update({
            predicted_winner: userBet.predicted_winner,
            bet_type_id: userBet.bet_type_id,
          })
          .eq('user_id', userBet.user_id)
          .eq('bout_id', userBet.bout_id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating user bet:', updateError);
          return null;
        }

        return updatedBet;
      }

      // Otherwise, create a new bet
      const { data: newBet, error: insertError } = await supabase
        .from('user_bets')
        .insert({
          user_id: userBet.user_id,
          bout_id: userBet.bout_id,
          bet_type_id: userBet.bet_type_id,
          predicted_winner: userBet.predicted_winner,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user bet:', insertError);
        return null;
      }

      return newBet;
    } catch (error) {
      console.error('Error in createUserBet:', error);
      return null;
    }
  },

  /**
   * Get all bets for a user
   * @param userId The user ID
   * @returns Array of user bets
   */
  async getUserBets(userId: string): Promise<UserBet[]> {
    try {
      const { data, error } = await supabase
        .from('user_bets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting user bets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserBets:', error);
      return [];
    }
  },

  /**
   * Get all bets for a bout
   * @param boutId The bout ID
   * @returns Array of user bets
   */
  async getBoutBets(boutId: number): Promise<UserBet[]> {
    try {
      const { data, error } = await supabase
        .from('user_bets')
        .select('*')
        .eq('bout_id', boutId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting bout bets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBoutBets:', error);
      return [];
    }
  },

  /**
   * Update the result of a user bet
   * @param userBet The user bet with updated result
   * @returns The updated user bet
   */
  async updateBetResult(userBet: Pick<UserBet, 'user_id' | 'bout_id' | 'bet_type_id' | 'predicted_winner'>): Promise<UserBet | null> {
    try {
      const { data, error } = await supabase
        .from('user_bets')
        .update({
          result: userBet.predicted_winner,
        })
        .eq('user_id', userBet.user_id)
        .eq('bout_id', userBet.bout_id)
        .eq('bet_type_id', userBet.bet_type_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating bet result:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateBetResult:', error);
      return null;
    }
  },

  // services/pointsService.ts

  async getUserBetsForEventBouts(userId: string, eventId: number): Promise<UserBet[] | null> {
    try {
      const { data, error } = await supabase
          .from('user_bets')
          .select(`
        *,
        bouts!inner (
          event_id
        ),
        predicted_fighter:fighters (
          id,
          name
        )
      `)
          .eq('user_id', userId)
          .eq('bouts.event_id', eventId)

      if (error) {
        console.error(`Error getting user bets for event ID ${eventId}:`, error);
        return [];
      }

      return data;

    } catch (error) {
      console.error('Error in getUserBetsForEventBouts:', error);
      return [];
    }
  },

  async calculateUserPoints():Promise<void>{
    const { error } = await supabase.rpc('calculate_user_points');

    if (error) {
      throw new Error(`Failed to calculate points: ${error.message}`);
    }
  },


};