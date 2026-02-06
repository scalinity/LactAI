import type { Unit, Side, SessionSource, SessionType } from "./common";

export interface Session {
  id?: number;
  timestamp: Date;
  amount_ml: number;
  amount_entered: number;
  unit_entered: Unit;
  side?: Side;
  session_type?: SessionType;
  amount_left_ml?: number;
  amount_right_ml?: number;
  duration_min?: number;
  notes?: string;
  source: SessionSource;
  confidence?: number;
  created_at: Date;
  updated_at: Date;
}

export interface SessionFormData {
  amount: string;
  unit: Unit;
  timestamp: Date;
  side: Side | null;
  duration_min: string;
  notes: string;
}

export interface SessionFilter {
  startDate?: Date;
  endDate?: Date;
  side?: Side;
  source?: SessionSource;
  session_type?: SessionType;
}
