import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import type { Candidate } from '../types';
import { calculateYearsOfExperience } from '../utils/date';

interface CompareModalProps {
  candidates: [Candidate, Candidate];
  onClose: () => void;
}

export default function CompareModal({ candidates, onClose }: CompareModalProps) {
  const [c1, c2] = candidates;

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 modal-backdrop animate-fade-in"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-2.5 rounded-xl bg-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all z-10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-8 relative">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-purple-800 bg-clip-text text-transparent mb-8 flex items-center gap-3">
              <svg className="w-7 h-7 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare Candidates
            </h2>

            {/* Headers */}
            <div className="grid grid-cols-2 gap-8 mb-6">
              <CompareHeader candidate={c1} />
              <CompareHeader candidate={c2} />
            </div>

            {/* Content */}
            <div className="space-y-6">
                {/* Summary */}
                <CompareSection title="Summary">
                  <div className="grid grid-cols-2 gap-8">
                    <p className="text-sm text-gray-700 leading-relaxed p-4 rounded-xl bg-gray-50/80 border border-gray-100">{c1.summary}</p>
                    <p className="text-sm text-gray-700 leading-relaxed p-4 rounded-xl bg-gray-50/80 border border-gray-100">{c2.summary}</p>
                  </div>
                </CompareSection>

                {/* Skills */}
                <CompareSection title="Skills">
                  <div className="grid grid-cols-2 gap-8">
                    <SkillsList skills={c1.skills} compareWith={c2.skills} />
                    <SkillsList skills={c2.skills} compareWith={c1.skills} />
                  </div>
                </CompareSection>

                {/* Experience Details */}
                <CompareSection title="Experience Details">
                  <div className="grid grid-cols-2 gap-8">
                    <ExperienceList experience={c1.experience} compareWith={c2.experience} />
                    <ExperienceList experience={c2.experience} compareWith={c1.experience} />
                  </div>
                </CompareSection>

                {/* Education */}
                <CompareSection title="Education">
                  <div className="grid grid-cols-2 gap-8">
                    <EducationList education={c1.education} />
                    <EducationList education={c2.education} />
                  </div>
                </CompareSection>

                {/* Certifications */}
                <CompareSection title="Certifications">
                  <div className="grid grid-cols-2 gap-8">
                    <CertificationsList certifications={c1.certifications} />
                    <CertificationsList certifications={c2.certifications} />
                  </div>
                </CompareSection>

                {/* Languages */}
                <CompareSection title="Languages">
                  <div className="grid grid-cols-2 gap-8">
                    <LanguagesList languages={c1.languages} />
                    <LanguagesList languages={c2.languages} />
                  </div>
                </CompareSection>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CompareHeader({ candidate }: { candidate: Candidate }) {
  const currentJob = candidate.experience[0];
  const yearsOfExp = candidate.yearsOfExperience ?? calculateYearsOfExperience(candidate.experience);
  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-white to-purple-50/50 border border-purple-100/50">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-purple-200">
          {candidate.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">{candidate.name}</h3>
          {currentJob && <p className="text-gray-600 mt-0.5">{currentJob.title}</p>}
          <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {candidate.location}
          </p>
          <p className="text-sm font-medium text-purple-600 mt-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {yearsOfExp} years of experience
          </p>
        </div>
      </div>
    </div>
  );
}

function CompareSection({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`py-5 ${className}`}>
      <h4 className="text-sm font-semibold text-purple-600 uppercase tracking-wide mb-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        {title}
      </h4>
      {children}
    </div>
  );
}

function SkillsList({
  skills,
  compareWith,
}: {
  skills: Candidate['skills'];
  compareWith: Candidate['skills'];
}) {
  const compareSkillNames = compareWith.map((s) => s.name.toLowerCase());
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => {
        const isUnique = !compareSkillNames.includes(skill.name.toLowerCase());
        return (
          <span
            key={skill.name}
            className={`skill-tag px-3 py-1.5 rounded-lg text-sm ${
              isUnique
                ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 border border-emerald-200'
                : 'bg-gradient-to-r from-purple-50 to-purple-100/50 text-purple-700 border border-purple-100/50'
            }`}
          >
            {skill.name}
            {skill.level && <span className="text-xs ml-1 opacity-70">({skill.level})</span>}
            {isUnique && (
              <span className="ml-1.5 text-emerald-500">
                <svg className="w-3 h-3 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function ExperienceList({
  experience,
  compareWith
}: {
  experience: Candidate['experience'];
  compareWith: Candidate['experience'];
}) {
  const compareTitles = compareWith.map((e) => e.title.toLowerCase());

  return (
    <div className="space-y-3">
      {experience.map((exp, idx) => {
        const isCommon = compareTitles.some((title) =>
          title.includes(exp.title.toLowerCase()) || exp.title.toLowerCase().includes(title)
        );
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl border transition-all ${
              isCommon
                ? 'bg-purple-50/80 border-purple-200'
                : 'bg-gray-50/80 border-gray-100'
            }`}
          >
            <p className="font-medium text-gray-900 text-sm">{exp.title}</p>
            <p className="text-xs text-gray-600 mt-1">{exp.company}</p>
            <p className="text-xs text-purple-500 font-medium mt-1">
              {exp.startDate} — {exp.endDate || 'Present'}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function EducationList({ education }: { education: Candidate['education'] }) {
  return (
    <div className="space-y-3">
      {education.map((edu, idx) => (
        <div key={idx} className="p-4 rounded-xl bg-gray-50/80 border border-gray-100">
          <p className="font-medium text-gray-900 text-sm">{edu.degree}</p>
          <p className="text-xs text-gray-600 mt-1">{edu.institution}</p>
          <p className="text-xs text-purple-500 font-medium mt-1">
            {edu.startDate} — {edu.endDate || 'Present'}
          </p>
        </div>
      ))}
    </div>
  );
}

function CertificationsList({ certifications }: { certifications: Candidate['certifications'] }) {
  if (certifications.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 text-center">
        <p className="text-sm text-gray-400">No certifications</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {certifications.map((cert, idx) => (
        <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-gray-50/80 border border-gray-100">
          <span className="text-sm text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            {cert.name}
          </span>
          <span className="text-xs text-purple-500 font-medium">{cert.year}</span>
        </div>
      ))}
    </div>
  );
}

function LanguagesList({ languages }: { languages: Candidate['languages'] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {languages.map((lang) => (
        <span key={lang} className="px-4 py-2 bg-gray-50 rounded-xl text-sm border border-gray-100 text-gray-700">
          {lang}
        </span>
      ))}
    </div>
  );
}
