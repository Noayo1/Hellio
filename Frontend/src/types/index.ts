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
