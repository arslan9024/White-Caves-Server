import { SCORE_THRESHOLDS, SCREENING_STATUS } from '../constants/ScoreLevels.js';

export interface RawCandidateScoreRecord {
  overall_score: number;
  screening_status?: string;
  cultural_fit?: number;
  cultural_fit_score?: number;
  location_match?: number;
  location_match_score?: number;
  [key: string]: unknown;
}

export function normalizeCandidateScore(record: RawCandidateScoreRecord): Record<string, unknown> {
  const score = record.overall_score;
  const status =
    score >= SCORE_THRESHOLDS.EXCELLENT
      ? SCREENING_STATUS.STRONG_MATCH
      : score >= SCORE_THRESHOLDS.STRONG
        ? SCREENING_STATUS.MODERATE_MATCH
        : score >= SCORE_THRESHOLDS.FAIR
          ? SCREENING_STATUS.WEAK_MATCH
          : SCREENING_STATUS.REJECTED;
  return {
    ...record,
    screening_status: record.screening_status ?? status,
    cultural_fit_score: record.cultural_fit ?? record.cultural_fit_score,
    location_match_score: record.location_match ?? record.location_match_score,
  };
}

export function normalizeLeadScore(record: Record<string, any> | null): Record<string, any> | null {
  if (!record) return null;
  return {
    ...record,
    candidateId: record.candidate_id,
    jobId: record.job_id,
    overallScore: record.overall_score,
    scoreBreakdown: record.score_breakdown,
    leadTemperature: record.lead_temperature,
    qualificationLevel: record.qualification_level,
  };
}

export function normalizeInterviewSchedule(record: Record<string, any> | null): Record<string, any> | null {
  if (!record) return null;
  return {
    ...record,
    candidateId: record.candidate_id,
    jobId: record.job_id,
    status: record.session_status,
    interviewers: record.interviewer_ids,
    availableSlots: record.available_slots,
    selectedSlot: record.selected_slot,
    scheduledAt: record.interview_date,
    declineReason: record.decline_reason,
  };
}

export function normalizeInterview(record: Record<string, any>): Record<string, any> {
  return {
    ...record,
    candidateId: record.candidate_id,
    jobId: record.job_id,
    scheduledAt: record.scheduled_at,
    completedAt: record.completed_at,
  };
}
