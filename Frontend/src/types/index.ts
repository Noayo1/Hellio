// === CANDIDATE ===

export type CandidateStatus = 'active' | 'inactive' | 'hired';

export interface Skill {
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface Experience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string | null;
  highlights: string[];
}

export interface Education {
  degree: string;
  institution: string;
  startDate: string;
  endDate: string | null;
  status: 'completed' | 'in_progress';
}

export interface Certification {
  name: string;
  year: string;
}

export interface CandidateFile {
  id: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  createdAt: string;
  versionNumber: number;
  isCurrent: boolean;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location: string;
  linkedIn?: string;
  github?: string;

  status: CandidateStatus;
  summary: string;
  yearsOfExperience?: number | null;

  skills: Skill[];
  languages: string[];
  experience: Experience[];
  education: Education[];
  certifications: Certification[];

  positionIds: string[];
  cvFile: string;
}

// === POSITION ===

export type PositionStatus = 'open' | 'closed' | 'on_hold';

export interface Requirement {
  text: string;
  required: boolean;
}

export interface Position {
  id: string;
  title: string;
  company: string;
  location: string;
  status: PositionStatus;

  description: string;
  requirements: Requirement[];
  skills: string[];
  experienceYears: number;

  workType: 'remote' | 'hybrid' | 'onsite';
  salary?: string;

  contactName: string;
  contactEmail: string;
}

// === EXTRACTION LOGS ===

export interface ExtractionLog {
  id: string;
  source_file_path: string;
  source_type: 'cv' | 'job';
  status: 'pending' | 'success' | 'failed';
  error_message?: string;
  total_duration_ms: number;
  created_at: string;
  candidate_id?: string;
}

export interface ExtractionLogDetail extends ExtractionLog {
  raw_text: string;
  regex_results: {
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    github: string | null;
  };
  llm_raw_response: string;
  llm_parsed_data: unknown;
  validation_errors: string[];
}
