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
        <div className="relative bg-gradient-to-br from-white via-white to-purple-50 rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
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
              <div className="col-span-2 grid grid-cols-2 gap-8 divide-x divide-purple-200">
                <div className="pr-8"><CompareHeader candidate={c1} /></div>
                <div className="pl-8"><CompareHeader candidate={c2} /></div>
              </div>

              {/* Divider */}
              <div className="col-span-2 border-t border-purple-200" />

              {/* Summary */}
              <CompareSection title="Summary" className="col-span-2">
                <div className="grid grid-cols-2 gap-8 divide-x divide-purple-200">
                  <p className="text-sm text-gray-700 leading-relaxed pr-8">{c1.summary}</p>
                  <p className="text-sm text-gray-700 leading-relaxed pl-8">{c2.summary}</p>
                </div>
              </CompareSection>

              {/* Skills */}
              <CompareSection title="Skills" className="col-span-2">
                <div className="grid grid-cols-2 gap-8 divide-x divide-purple-200">
                  <div className="pr-8"><SkillsList skills={c1.skills} compareWith={c2.skills} /></div>
                  <div className="pl-8"><SkillsList skills={c2.skills} compareWith={c1.skills} /></div>
                </div>
              </CompareSection>

              {/* Experience Details */}
              <CompareSection title="Experience Details" className="col-span-2">
                <div className="grid grid-cols-2 gap-8 divide-x divide-purple-200">
                  <div className="pr-8"><ExperienceList experience={c1.experience} compareWith={c2.experience} /></div>
                  <div className="pl-8"><ExperienceList experience={c2.experience} compareWith={c1.experience} /></div>
                </div>
              </CompareSection>

              {/* Education */}
              <CompareSection title="Education" className="col-span-2">
                <div className="grid grid-cols-2 gap-8 divide-x divide-purple-200">
                  <div className="pr-8"><EducationList education={c1.education} /></div>
                  <div className="pl-8"><EducationList education={c2.education} /></div>
                </div>
              </CompareSection>

              {/* Certifications */}
              <CompareSection title="Certifications" className="col-span-2">
                <div className="grid grid-cols-2 gap-8 divide-x divide-purple-200">
                  <div className="pr-8"><CertificationsList certifications={c1.certifications} /></div>
                  <div className="pl-8"><CertificationsList certifications={c2.certifications} /></div>
                </div>
              </CompareSection>

              {/* Languages */}
              <CompareSection title="Languages" className="col-span-2">
                <div className="grid grid-cols-2 gap-8 divide-x divide-purple-200">
                  <div className="pr-8"><LanguagesList languages={c1.languages} /></div>
                  <div className="pl-8"><LanguagesList languages={c2.languages} /></div>
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
  const yearsOfExp = calculateYearsOfExperience(candidate.experience);
  return (
    <div className="pb-5">
      <h3 className="text-xl font-bold text-gray-900">{candidate.name}</h3>
      {currentJob && <p className="text-gray-600 mt-1">{currentJob.title}</p>}
      <p className="text-sm text-gray-500 mt-2">{candidate.location}</p>
      <p className="text-sm font-medium text-purple-600 mt-2">{yearsOfExp} years of experience</p>
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
  const compareSkillNames = compareWith.map((s) => s.name.toLowerCase());
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => {
        const isUnique = !compareSkillNames.includes(skill.name.toLowerCase());
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

function ExperienceList({
  experience,
  compareWith
}: {
  experience: Candidate['experience'];
  compareWith: Candidate['experience'];
}) {
  const compareTitles = compareWith.map((e) => e.title.toLowerCase());

  return (
    <div className="space-y-4">
      {experience.map((exp, idx) => {
        const isCommon = compareTitles.some((title) =>
          title.includes(exp.title.toLowerCase()) || exp.title.toLowerCase().includes(title)
        );
        return (
          <div
            key={idx}
            className={`${isCommon ? 'bg-purple-50 p-3 rounded-lg' : ''}`}
          >
            <p className="font-medium text-gray-900 text-sm">{exp.title}</p>
            <p className="text-xs text-gray-600 mt-1">{exp.company}</p>
            <p className="text-xs text-gray-500">
              {exp.startDate} - {exp.endDate || 'Present'}
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

function LanguagesList({ languages }: { languages: Candidate['languages'] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {languages.map((lang) => (
        <span key={lang} className="px-3 py-1.5 bg-gray-100 rounded-md text-sm">
          {lang}
        </span>
      ))}
    </div>
  );
}

function ExperienceComparison({ c1, c2 }: { c1: Candidate; c2: Candidate }) {
  const years1 = calculateYearsOfExperience(c1.experience);
  const years2 = calculateYearsOfExperience(c2.experience);

  const titles1 = c1.experience.map((e) => e.title.toLowerCase());
  const titles2 = c2.experience.map((e) => e.title.toLowerCase());

  // Find common role types (fuzzy match on title keywords)
  const commonRoles: string[] = [];
  const unique1: string[] = [];
  const unique2: string[] = [];

  c1.experience.forEach((exp) => {
    const hasMatch = titles2.some((t) =>
      t.includes(exp.title.toLowerCase()) || exp.title.toLowerCase().includes(t)
    );
    if (hasMatch && !commonRoles.includes(exp.title)) {
      commonRoles.push(exp.title);
    } else if (!hasMatch) {
      unique1.push(exp.title);
    }
  });

  c2.experience.forEach((exp) => {
    const hasMatch = titles1.some((t) =>
      t.includes(exp.title.toLowerCase()) || exp.title.toLowerCase().includes(t)
    );
    if (!hasMatch) {
      unique2.push(exp.title);
    }
  });

  return (
    <div className="space-y-6">
      {/* Years comparison */}
      <div className="grid grid-cols-2 gap-8">
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-purple-700">{years1}</p>
          <p className="text-sm text-purple-600">years total</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-purple-700">{years2}</p>
          <p className="text-sm text-purple-600">years total</p>
        </div>
      </div>

      {/* Common experience */}
      {commonRoles.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">Common Experience</h5>
          <div className="flex flex-wrap gap-2">
            {commonRoles.map((role) => (
              <span
                key={role}
                className="px-3 py-1.5 bg-purple-100 text-purple-700 border border-purple-200 rounded-md text-sm"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Unique skills */}
      <UniqueSkillsComparison c1={c1} c2={c2} />
    </div>
  );
}

function UniqueSkillsComparison({ c1, c2 }: { c1: Candidate; c2: Candidate }) {
  const skills1 = c1.skills.map((s) => s.name.toLowerCase());
  const skills2 = c2.skills.map((s) => s.name.toLowerCase());

  const uniqueSkills1 = c1.skills.filter((s) => !skills2.includes(s.name.toLowerCase()));
  const uniqueSkills2 = c2.skills.filter((s) => !skills1.includes(s.name.toLowerCase()));

  return (
    <div className="grid grid-cols-2 gap-8 divide-x divide-purple-200">
      <div className="pr-8">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Unique Skills - {c1.name.split(' ')[0]}</h5>
        {uniqueSkills1.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {uniqueSkills1.map((skill) => (
              <span
                key={skill.name}
                className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm"
              >
                {skill.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No unique skills</p>
        )}
      </div>
      <div className="pl-8">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Unique Skills - {c2.name.split(' ')[0]}</h5>
        {uniqueSkills2.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {uniqueSkills2.map((skill) => (
              <span
                key={skill.name}
                className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-sm"
              >
                {skill.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No unique skills</p>
        )}
      </div>
    </div>
  );
}

function calculateYearsOfExperience(experience: Candidate['experience']): number {
  if (experience.length === 0) return 0;

  const now = new Date();

  const ranges = experience.map((exp) => ({
    start: parseDate(exp.startDate),
    end: exp.endDate ? parseDate(exp.endDate) : now,
  }));

  ranges.sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: { start: Date; end: Date }[] = [];
  for (const range of ranges) {
    if (merged.length === 0 || range.start > merged[merged.length - 1].end) {
      merged.push({ ...range });
    } else {
      merged[merged.length - 1].end = new Date(
        Math.max(merged[merged.length - 1].end.getTime(), range.end.getTime())
      );
    }
  }

  let totalMonths = 0;
  for (const range of merged) {
    const months =
      (range.end.getFullYear() - range.start.getFullYear()) * 12 +
      (range.end.getMonth() - range.start.getMonth());
    totalMonths += Math.max(0, months);
  }

  return Math.round(totalMonths / 12);
}

function parseDate(dateStr: string): Date {
  const [year, month] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1);
}
