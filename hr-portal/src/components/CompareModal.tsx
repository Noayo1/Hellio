import type { Candidate } from '../types';

interface CompareModalProps {
  candidates: [Candidate, Candidate];
  onClose: () => void;
}

export default function CompareModal({ candidates, onClose }: CompareModalProps) {
  const [c1, c2] = candidates;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Compare Candidates</h2>

            <div className="grid grid-cols-2 gap-8">
              {/* Headers */}
              <CompareHeader candidate={c1} />
              <CompareHeader candidate={c2} />

              {/* Summary */}
              <CompareSection title="Summary" className="col-span-2">
                <div className="grid grid-cols-2 gap-8">
                  <p className="text-sm text-gray-700 leading-relaxed">{c1.summary}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{c2.summary}</p>
                </div>
              </CompareSection>

              {/* Skills */}
              <CompareSection title="Skills" className="col-span-2">
                <div className="grid grid-cols-2 gap-8">
                  <SkillsList skills={c1.skills} compareWith={c2.skills} />
                  <SkillsList skills={c2.skills} compareWith={c1.skills} />
                </div>
              </CompareSection>

              {/* Experience */}
              <CompareSection title="Experience" className="col-span-2">
                <div className="grid grid-cols-2 gap-8">
                  <ExperienceList experience={c1.experience} />
                  <ExperienceList experience={c2.experience} />
                </div>
              </CompareSection>

              {/* Education */}
              <CompareSection title="Education" className="col-span-2">
                <div className="grid grid-cols-2 gap-8">
                  <EducationList education={c1.education} />
                  <EducationList education={c2.education} />
                </div>
              </CompareSection>

              {/* Certifications */}
              <CompareSection title="Certifications" className="col-span-2">
                <div className="grid grid-cols-2 gap-8">
                  <CertificationsList certifications={c1.certifications} />
                  <CertificationsList certifications={c2.certifications} />
                </div>
              </CompareSection>

              {/* Languages */}
              <CompareSection title="Languages" className="col-span-2">
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-wrap gap-2">
                    {c1.languages.map((lang) => (
                      <span key={lang} className="px-3 py-1.5 bg-gray-100 rounded-md text-sm">
                        {lang}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c2.languages.map((lang) => (
                      <span key={lang} className="px-3 py-1.5 bg-gray-100 rounded-md text-sm">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </CompareSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareHeader({ candidate }: { candidate: Candidate }) {
  const currentJob = candidate.experience[0];
  return (
    <div className="pb-5 border-b border-purple-100">
      <h3 className="text-xl font-bold text-gray-900">{candidate.name}</h3>
      {currentJob && <p className="text-gray-600 mt-1">{currentJob.title}</p>}
      <p className="text-sm text-gray-500 mt-2">{candidate.location}</p>
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
    <div className={`py-5 border-b border-gray-100 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
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
  const compareSkillNames = compareWith.map((s) => s.name);
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => {
        const isUnique = !compareSkillNames.includes(skill.name);
        return (
          <span
            key={skill.name}
            className={`px-3 py-1.5 rounded-md text-sm ${
              isUnique
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-purple-50 text-purple-700 border border-purple-100'
            }`}
          >
            {skill.name}
            {skill.level && <span className="text-xs ml-1 opacity-70">({skill.level})</span>}
          </span>
        );
      })}
    </div>
  );
}

function ExperienceList({ experience }: { experience: Candidate['experience'] }) {
  return (
    <div className="space-y-4">
      {experience.map((exp, idx) => (
        <div key={idx} className="border-l-2 border-purple-200 pl-4">
          <p className="font-medium text-gray-900 text-sm">{exp.title}</p>
          <p className="text-xs text-gray-600 mt-1">{exp.company}</p>
          <p className="text-xs text-gray-500">
            {exp.startDate} - {exp.endDate || 'Present'}
          </p>
        </div>
      ))}
    </div>
  );
}

function EducationList({ education }: { education: Candidate['education'] }) {
  return (
    <div className="space-y-3">
      {education.map((edu, idx) => (
        <div key={idx}>
          <p className="font-medium text-gray-900 text-sm">{edu.degree}</p>
          <p className="text-xs text-gray-600">{edu.institution}</p>
          <p className="text-xs text-gray-500">
            {edu.startDate} - {edu.endDate || 'Present'}
          </p>
        </div>
      ))}
    </div>
  );
}

function CertificationsList({ certifications }: { certifications: Candidate['certifications'] }) {
  if (certifications.length === 0) {
    return <p className="text-sm text-gray-400">No certifications</p>;
  }
  return (
    <div className="space-y-2">
      {certifications.map((cert, idx) => (
        <div key={idx} className="flex justify-between text-sm">
          <span className="text-gray-700">{cert.name}</span>
          <span className="text-gray-500">{cert.year}</span>
        </div>
      ))}
    </div>
  );
}
