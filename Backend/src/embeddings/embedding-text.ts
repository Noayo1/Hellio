/**
 * Builds standardized text for embedding generation.
 * Combines relevant fields into a single searchable document.
 */

export interface CandidateEmbeddingData {
  name: string;
  summary?: string | null;
  location?: string | null;
  yearsOfExperience?: number | null;
  skills: Array<{ name: string; level?: string | null }>;
  languages: string[];
  experience: Array<{
    title: string;
    company: string;
    highlights: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
  }>;
  certifications: Array<{ name: string }>;
}

export interface PositionEmbeddingData {
  title: string;
  company: string;
  description?: string | null;
  location?: string | null;
  experienceYears?: number | null;
  workType?: string | null;
  skills: string[];
  requirements: Array<{ text: string; required: boolean }>;
}

/**
 * Build embedding text for a candidate.
 * Format prioritizes semantic searchability.
 */
export function buildCandidateEmbeddingText(candidate: CandidateEmbeddingData): string {
  const sections: string[] = [];

  // Core identity
  sections.push(`Candidate: ${candidate.name}`);

  // Summary (most important semantic content)
  if (candidate.summary) {
    sections.push(`Summary: ${candidate.summary}`);
  }

  // Location
  if (candidate.location) {
    sections.push(`Location: ${candidate.location}`);
  }

  // Experience level
  if (candidate.yearsOfExperience != null) {
    sections.push(`Experience: ${candidate.yearsOfExperience} years`);
  }

  // Skills (critical for matching)
  if (candidate.skills.length > 0) {
    const skillList = candidate.skills
      .map((s) => (s.level ? `${s.name} (${s.level})` : s.name))
      .join(', ');
    sections.push(`Skills: ${skillList}`);
  }

  // Languages
  if (candidate.languages.length > 0) {
    sections.push(`Languages: ${candidate.languages.join(', ')}`);
  }

  // Work history (titles and highlights)
  if (candidate.experience.length > 0) {
    const expText = candidate.experience
      .map((e) => {
        const highlights = e.highlights.slice(0, 3).join('; ');
        return `${e.title} at ${e.company}${highlights ? ': ' + highlights : ''}`;
      })
      .join('. ');
    sections.push(`Experience: ${expText}`);
  }

  // Education
  if (candidate.education.length > 0) {
    const eduText = candidate.education
      .map((e) => `${e.degree} from ${e.institution}`)
      .join(', ');
    sections.push(`Education: ${eduText}`);
  }

  // Certifications
  if (candidate.certifications.length > 0) {
    const certText = candidate.certifications.map((c) => c.name).join(', ');
    sections.push(`Certifications: ${certText}`);
  }

  return sections.join('\n');
}

/**
 * Build embedding text for a position.
 * Format emphasizes job requirements for candidate matching.
 */
export function buildPositionEmbeddingText(position: PositionEmbeddingData): string {
  const sections: string[] = [];

  // Job identity
  sections.push(`Position: ${position.title} at ${position.company}`);

  // Description
  if (position.description) {
    sections.push(`Description: ${position.description}`);
  }

  // Location and work type
  if (position.location) {
    sections.push(`Location: ${position.location}`);
  }
  if (position.workType) {
    sections.push(`Work Type: ${position.workType}`);
  }

  // Experience requirement
  if (position.experienceYears != null) {
    sections.push(`Required Experience: ${position.experienceYears}+ years`);
  }

  // Required skills (critical for matching)
  if (position.skills.length > 0) {
    sections.push(`Required Skills: ${position.skills.join(', ')}`);
  }

  // Requirements
  if (position.requirements.length > 0) {
    const mustHave = position.requirements
      .filter((r) => r.required)
      .map((r) => r.text)
      .slice(0, 5);
    const niceToHave = position.requirements
      .filter((r) => !r.required)
      .map((r) => r.text)
      .slice(0, 3);

    if (mustHave.length > 0) {
      sections.push(`Must Have: ${mustHave.join('; ')}`);
    }
    if (niceToHave.length > 0) {
      sections.push(`Nice to Have: ${niceToHave.join('; ')}`);
    }
  }

  return sections.join('\n');
}
