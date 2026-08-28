export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      awards: {
        Row: {
          award_name: string
          award_type: string
          created_at: string
          description: string | null
          headline: string | null
          id: number
          is_provisional: boolean
          matchup_id: number | null
          recipient_player_id: number | null
          recipient_team_id: number | null
          recipient_type: string
          score: number | null
          season_id: number
          supporting_stats: Json | null
          week: number | null
        }
        Insert: {
          award_name: string
          award_type: string
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: never
          is_provisional?: boolean
          matchup_id?: number | null
          recipient_player_id?: number | null
          recipient_team_id?: number | null
          recipient_type: string
          score?: number | null
          season_id: number
          supporting_stats?: Json | null
          week?: number | null
        }
        Update: {
          award_name?: string
          award_type?: string
          created_at?: string
          description?: string | null
          headline?: string | null
          id?: never
          is_provisional?: boolean
          matchup_id?: number | null
          recipient_player_id?: number | null
          recipient_team_id?: number | null
          recipient_type?: string
          score?: number | null
          season_id?: number
          supporting_stats?: Json | null
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "awards_matchup_id_fkey"
            columns: ["matchup_id"]
            isOneToOne: false
            referencedRelation: "matchups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_recipient_player_id_fkey"
            columns: ["recipient_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_recipient_team_id_fkey"
            columns: ["recipient_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "awards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      champions: {
        Row: {
          created_at: string
          franchise_id: number
          id: number
          league_id: number
          note: string | null
          team_name: string | null
          year: number
        }
        Insert: {
          created_at?: string
          franchise_id: number
          id?: never
          league_id: number
          note?: string | null
          team_name?: string | null
          year: number
        }
        Update: {
          created_at?: string
          franchise_id?: number
          id?: never
          league_id?: number
          note?: string | null
          team_name?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "champions_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "champions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_score_events: {
        Row: {
          captured_at: string
          id: number
          linked_nfl_play_id: number | null
          match_confidence: number | null
          matchup_id: number | null
          new_points: number | null
          player_id: number
          point_delta: number | null
          previous_points: number | null
          season_id: number
          season_team_id: number
          week: number
        }
        Insert: {
          captured_at?: string
          id?: never
          linked_nfl_play_id?: number | null
          match_confidence?: number | null
          matchup_id?: number | null
          new_points?: number | null
          player_id: number
          point_delta?: number | null
          previous_points?: number | null
          season_id: number
          season_team_id: number
          week: number
        }
        Update: {
          captured_at?: string
          id?: never
          linked_nfl_play_id?: number | null
          match_confidence?: number | null
          matchup_id?: number | null
          new_points?: number | null
          player_id?: number
          point_delta?: number | null
          previous_points?: number | null
          season_id?: number
          season_team_id?: number
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_score_events_linked_nfl_play_id_fkey"
            columns: ["linked_nfl_play_id"]
            isOneToOne: false
            referencedRelation: "nfl_plays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_score_events_matchup_id_fkey"
            columns: ["matchup_id"]
            isOneToOne: false
            referencedRelation: "matchups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_score_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_score_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_score_events_season_team_id_fkey"
            columns: ["season_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      franchises: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          espn_member_id: string
          id: number
          league_id: number
          logo_url: string | null
          manager_name: string
          short_name: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          espn_member_id: string
          id?: never
          league_id: number
          logo_url?: string | null
          manager_name: string
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          espn_member_id?: string
          id?: never
          league_id?: number
          logo_url?: string | null
          manager_name?: string
          short_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "franchises_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          espn_league_id: number
          id: number
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          espn_league_id: number
          id?: never
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          espn_league_id?: number
          id?: never
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      matchup_snapshots: {
        Row: {
          away_projected_score: number | null
          away_score: number
          away_win_probability: number | null
          captured_at: string
          home_projected_score: number | null
          home_score: number
          home_win_probability: number | null
          id: number
          matchup_id: number
        }
        Insert: {
          away_projected_score?: number | null
          away_score: number
          away_win_probability?: number | null
          captured_at?: string
          home_projected_score?: number | null
          home_score: number
          home_win_probability?: number | null
          id?: never
          matchup_id: number
        }
        Update: {
          away_projected_score?: number | null
          away_score?: number
          away_win_probability?: number | null
          captured_at?: string
          home_projected_score?: number | null
          home_score?: number
          home_win_probability?: number | null
          id?: never
          matchup_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "matchup_snapshots_matchup_id_fkey"
            columns: ["matchup_id"]
            isOneToOne: false
            referencedRelation: "matchups"
            referencedColumns: ["id"]
          },
        ]
      }
      matchups: {
        Row: {
          away_projected_score: number | null
          away_score: number
          away_team_id: number | null
          espn_matchup_id: number
          home_projected_score: number | null
          home_score: number
          home_team_id: number | null
          id: number
          is_playoff: boolean
          last_synced_at: string | null
          margin: number | null
          matchup_period: number
          season_id: number
          status: string
          week: number
          winner_team_id: number | null
        }
        Insert: {
          away_projected_score?: number | null
          away_score?: number
          away_team_id?: number | null
          espn_matchup_id: number
          home_projected_score?: number | null
          home_score?: number
          home_team_id?: number | null
          id?: never
          is_playoff?: boolean
          last_synced_at?: string | null
          margin?: number | null
          matchup_period: number
          season_id: number
          status?: string
          week: number
          winner_team_id?: number | null
        }
        Update: {
          away_projected_score?: number | null
          away_score?: number
          away_team_id?: number | null
          espn_matchup_id?: number
          home_projected_score?: number | null
          home_score?: number
          home_team_id?: number | null
          id?: never
          is_playoff?: boolean
          last_synced_at?: string | null
          margin?: number | null
          matchup_period?: number
          season_id?: number
          status?: string
          week?: number
          winner_team_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matchups_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchups_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchups_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matchups_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      nfl_games: {
        Row: {
          away_team: string | null
          espn_event_id: string
          home_team: string | null
          id: number
          season: number
          start_time: string | null
          status: string | null
          week: number
        }
        Insert: {
          away_team?: string | null
          espn_event_id: string
          home_team?: string | null
          id?: never
          season: number
          start_time?: string | null
          status?: string | null
          week: number
        }
        Update: {
          away_team?: string | null
          espn_event_id?: string
          home_team?: string | null
          id?: never
          season?: number
          start_time?: string | null
          status?: string | null
          week?: number
        }
        Relationships: []
      }
      nfl_plays: {
        Row: {
          clock: string | null
          espn_play_id: string | null
          id: number
          nfl_game_id: number
          occurred_at: string | null
          period: number | null
          play_text: string | null
          play_type: string | null
          raw_payload: Json | null
          scoring_play: boolean
          sequence: number | null
        }
        Insert: {
          clock?: string | null
          espn_play_id?: string | null
          id?: never
          nfl_game_id: number
          occurred_at?: string | null
          period?: number | null
          play_text?: string | null
          play_type?: string | null
          raw_payload?: Json | null
          scoring_play?: boolean
          sequence?: number | null
        }
        Update: {
          clock?: string | null
          espn_play_id?: string | null
          id?: never
          nfl_game_id?: number
          occurred_at?: string | null
          period?: number | null
          play_text?: string | null
          play_type?: string | null
          raw_payload?: Json | null
          scoring_play?: boolean
          sequence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nfl_plays_nfl_game_id_fkey"
            columns: ["nfl_game_id"]
            isOneToOne: false
            referencedRelation: "nfl_games"
            referencedColumns: ["id"]
          },
        ]
      }
      player_week_scores: {
        Row: {
          actual_points: number | null
          game_status: string | null
          id: number
          is_starter: boolean
          last_synced_at: string | null
          lineup_slot: string
          lineup_slot_id: number
          player_id: number
          projected_points: number | null
          season_id: number
          season_team_id: number
          week: number
        }
        Insert: {
          actual_points?: number | null
          game_status?: string | null
          id?: never
          is_starter: boolean
          last_synced_at?: string | null
          lineup_slot: string
          lineup_slot_id: number
          player_id: number
          projected_points?: number | null
          season_id: number
          season_team_id: number
          week: number
        }
        Update: {
          actual_points?: number | null
          game_status?: string | null
          id?: never
          is_starter?: boolean
          last_synced_at?: string | null
          lineup_slot?: string
          lineup_slot_id?: number
          player_id?: number
          projected_points?: number | null
          season_id?: number
          season_team_id?: number
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_week_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_week_scores_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_week_scores_season_team_id_fkey"
            columns: ["season_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          active: boolean
          espn_player_id: number
          full_name: string
          id: number
          last_synced_at: string | null
          nfl_team: string | null
          position: string | null
        }
        Insert: {
          active?: boolean
          espn_player_id: number
          full_name: string
          id?: never
          last_synced_at?: string | null
          nfl_team?: string | null
          position?: string | null
        }
        Update: {
          active?: boolean
          espn_player_id?: number
          full_name?: string
          id?: never
          last_synced_at?: string | null
          nfl_team?: string | null
          position?: string | null
        }
        Relationships: []
      }
      playoff_snapshots: {
        Row: {
          bye: boolean
          captured_at: string
          id: number
          mode: string
          qualified: boolean
          season_id: number
          season_team_id: number
          seed: number | null
          tiebreaker_note: string | null
          week: number
        }
        Insert: {
          bye?: boolean
          captured_at?: string
          id?: never
          mode: string
          qualified?: boolean
          season_id: number
          season_team_id: number
          seed?: number | null
          tiebreaker_note?: string | null
          week: number
        }
        Update: {
          bye?: boolean
          captured_at?: string
          id?: never
          mode?: string
          qualified?: boolean
          season_id?: number
          season_team_id?: number
          seed?: number | null
          tiebreaker_note?: string | null
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "playoff_snapshots_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playoff_snapshots_season_team_id_fkey"
            columns: ["season_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roster_snapshots: {
        Row: {
          captured_at: string
          id: number
          lineup_slot_id: number
          phase: string
          player_id: number
          season_id: number
          season_team_id: number
          week: number
        }
        Insert: {
          captured_at?: string
          id?: never
          lineup_slot_id: number
          phase?: string
          player_id: number
          season_id: number
          season_team_id: number
          week: number
        }
        Update: {
          captured_at?: string
          id?: never
          lineup_slot_id?: number
          phase?: string
          player_id?: number
          season_id?: number
          season_team_id?: number
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "roster_snapshots_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_snapshots_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roster_snapshots_season_team_id_fkey"
            columns: ["season_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      season_teams: {
        Row: {
          abbreviation: string | null
          created_at: string
          division_id: number | null
          espn_team_id: number
          franchise_id: number | null
          id: number
          logo_url: string | null
          season_id: number
          team_name: string
          updated_at: string
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string
          division_id?: number | null
          espn_team_id: number
          franchise_id?: number | null
          id?: never
          logo_url?: string | null
          season_id: number
          team_name: string
          updated_at?: string
        }
        Update: {
          abbreviation?: string | null
          created_at?: string
          division_id?: number | null
          espn_team_id?: number
          franchise_id?: number | null
          id?: never
          logo_url?: string | null
          season_id?: number
          team_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_teams_franchise_id_fkey"
            columns: ["franchise_id"]
            isOneToOne: false
            referencedRelation: "franchises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_teams_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          acquisition_type: string | null
          created_at: string
          draft_completed: boolean
          draft_scheduled_at: string | null
          draft_type: string | null
          faab_budget: number | null
          final_scoring_period: number
          has_divisions: boolean
          id: number
          league_id: number
          lineup_slot_counts: Json
          playoff_team_count: number
          regular_season_weeks: number
          seeding_rule: string | null
          status: string
          updated_at: string
          uses_faab: boolean
          year: number
        }
        Insert: {
          acquisition_type?: string | null
          created_at?: string
          draft_completed?: boolean
          draft_scheduled_at?: string | null
          draft_type?: string | null
          faab_budget?: number | null
          final_scoring_period: number
          has_divisions?: boolean
          id?: never
          league_id: number
          lineup_slot_counts?: Json
          playoff_team_count: number
          regular_season_weeks: number
          seeding_rule?: string | null
          status?: string
          updated_at?: string
          uses_faab?: boolean
          year: number
        }
        Update: {
          acquisition_type?: string | null
          created_at?: string
          draft_completed?: boolean
          draft_scheduled_at?: string | null
          draft_type?: string | null
          faab_budget?: number | null
          final_scoring_period?: number
          has_divisions?: boolean
          id?: never
          league_id?: number
          lineup_slot_counts?: Json
          playoff_team_count?: number
          regular_season_weeks?: number
          seeding_rule?: string | null
          status?: string
          updated_at?: string
          uses_faab?: boolean
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "seasons_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      standings_snapshots: {
        Row: {
          all_play_losses: number | null
          all_play_wins: number | null
          captured_at: string
          expected_wins: number | null
          id: number
          losses: number
          points_against: number
          points_for: number
          season_id: number
          season_team_id: number
          seed: number | null
          ties: number
          week: number
          wins: number
        }
        Insert: {
          all_play_losses?: number | null
          all_play_wins?: number | null
          captured_at?: string
          expected_wins?: number | null
          id?: never
          losses?: number
          points_against?: number
          points_for?: number
          season_id: number
          season_team_id: number
          seed?: number | null
          ties?: number
          week: number
          wins?: number
        }
        Update: {
          all_play_losses?: number | null
          all_play_wins?: number | null
          captured_at?: string
          expected_wins?: number | null
          id?: never
          losses?: number
          points_against?: number
          points_for?: number
          season_id?: number
          season_team_id?: number
          seed?: number | null
          ties?: number
          week?: number
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_snapshots_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_snapshots_season_team_id_fkey"
            columns: ["season_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: number
          metadata: Json | null
          records_processed: number
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: never
          metadata?: Json | null
          records_processed?: number
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: never
          metadata?: Json | null
          records_processed?: number
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          action: string
          from_team_id: number | null
          id: number
          player_id: number
          to_team_id: number | null
          transaction_id: number
        }
        Insert: {
          action: string
          from_team_id?: number | null
          id?: never
          player_id: number
          to_team_id?: number | null
          transaction_id: number
        }
        Update: {
          action?: string
          from_team_id?: number | null
          id?: never
          player_id?: number
          to_team_id?: number | null
          transaction_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_from_team_id_fkey"
            columns: ["from_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_to_team_id_fkey"
            columns: ["to_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          espn_transaction_id: string
          faab_amount: number | null
          id: number
          processed_at: string | null
          proposed_at: string | null
          raw_payload: Json | null
          related_team_id: number | null
          season_id: number
          season_team_id: number | null
          status: string | null
          transaction_type: string
          week: number | null
        }
        Insert: {
          created_at?: string
          espn_transaction_id: string
          faab_amount?: number | null
          id?: never
          processed_at?: string | null
          proposed_at?: string | null
          raw_payload?: Json | null
          related_team_id?: number | null
          season_id: number
          season_team_id?: number | null
          status?: string | null
          transaction_type: string
          week?: number | null
        }
        Update: {
          created_at?: string
          espn_transaction_id?: string
          faab_amount?: number | null
          id?: never
          processed_at?: string | null
          proposed_at?: string | null
          raw_payload?: Json | null
          related_team_id?: number | null
          season_id?: number
          season_team_id?: number | null
          status?: string | null
          transaction_type?: string
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_related_team_id_fkey"
            columns: ["related_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_season_team_id_fkey"
            columns: ["season_team_id"]
            isOneToOne: false
            referencedRelation: "season_teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      sync_status: {
        Row: {
          finished_at: string | null
          records_processed: number | null
          started_at: string | null
          status: string | null
          sync_type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
