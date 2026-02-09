import bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedDataDir = join(__dirname, '../seed-data');
const cvsFolder = process.env.CVS_FOLDER || join(seedDataDir, 'cvs');

interface Skill {
  name: string;
  level?: string;
}

interface Experience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  highlights?: string[];
}

interface Education {
  degree: string;
  institution: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

interface Certification {
  name: string;
  year?: number | string;
}

interface Requirement {
  text: string;
  required: boolean;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location: string;
  linkedIn?: string;
  github?: string;
  status: string;
  summary: string;
  skills: Skill[];
  languages: string[];
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
  positionIds: string[];
  cvFile: string;
}

interface Position {
  id: string;
  title: string;
  company: string;
  location: string;
  status: string;
  description: string;
  requirements: Requirement[];
  skills: string[];
  experienceYears: number;
  workType: string;
  salary?: string;
  contactName: string;
  contactEmail: string;
}

// Helper to get or create a skill
async function getOrCreateSkill(skillName: string): Promise<number> {
  const result = await pool.query(
    `INSERT INTO skills (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [skillName]
  );
  return result.rows[0].id;
}

// Helper to get or create a language
async function getOrCreateLanguage(langName: string): Promise<number> {
  const result = await pool.query(
    `INSERT INTO languages (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [langName]
  );
  return result.rows[0].id;
}

// Helper to convert "YYYY-MM" to "YYYY-MM-01" for DATE type
function toDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // If in YYYY-MM format, append -01
  if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
  return dateStr;
}

async function seed() {
  console.log('Seeding database...');

  try {
    // Seed admin user
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('ADMIN_PASSWORD environment variable is required');
    }
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = $3, role = $4`,
      ['admin@hellio.com', passwordHash, 'Admin', 'admin']
    );
    console.log('Admin user created: admin@hellio.com (role: admin)');

    // Seed viewer user
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = $3, role = $4`,
      ['viewer@hellio.com', passwordHash, 'Viewer', 'viewer']
    );
    console.log('Viewer user created: viewer@hellio.com (role: viewer)');

    // Load candidates from Frontend JSON
    const candidatesPath = process.env.CANDIDATES_JSON || join(seedDataDir, 'candidates.json');
    const candidatesData = JSON.parse(readFileSync(candidatesPath, 'utf-8')) as Candidate[];

    for (const candidate of candidatesData) {
      // Insert candidate (without JSONB fields)
      await pool.query(
        `INSERT INTO candidates (id, name, email, phone, location, linkedin, github, status, summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           name = $2, email = $3, phone = $4, location = $5, linkedin = $6, github = $7,
           status = $8, summary = $9, updated_at = NOW()`,
        [
          candidate.id,
          candidate.name,
          candidate.email,
          candidate.phone || null,
          candidate.location,
          candidate.linkedIn || null,
          candidate.github || null,
          candidate.status,
          candidate.summary,
        ]
      );

      // Clear existing related data for this candidate (for idempotency)
      await pool.query('DELETE FROM candidate_skills WHERE candidate_id = $1', [candidate.id]);
      await pool.query('DELETE FROM candidate_languages WHERE candidate_id = $1', [candidate.id]);
      await pool.query('DELETE FROM experiences WHERE candidate_id = $1', [candidate.id]);
      await pool.query('DELETE FROM education WHERE candidate_id = $1', [candidate.id]);
      await pool.query('DELETE FROM certifications WHERE candidate_id = $1', [candidate.id]);

      // Insert skills
      for (const skill of candidate.skills) {
        const skillId = await getOrCreateSkill(skill.name);
        await pool.query(
          `INSERT INTO candidate_skills (candidate_id, skill_id, level) VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [candidate.id, skillId, skill.level || null]
        );
      }

      // Insert languages
      for (const lang of candidate.languages) {
        const langId = await getOrCreateLanguage(lang);
        await pool.query(
          `INSERT INTO candidate_languages (candidate_id, language_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [candidate.id, langId]
        );
      }

      // Insert experiences with highlights
      for (let i = 0; i < candidate.experience.length; i++) {
        const exp = candidate.experience[i];
        const expResult = await pool.query(
          `INSERT INTO experiences (candidate_id, title, company, location, start_date, end_date, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            candidate.id,
            exp.title,
            exp.company,
            exp.location || null,
            toDate(exp.startDate),
            toDate(exp.endDate),
            i,
          ]
        );
        const expId = expResult.rows[0].id;

        // Insert highlights
        if (exp.highlights) {
          for (let j = 0; j < exp.highlights.length; j++) {
            await pool.query(
              `INSERT INTO experience_highlights (experience_id, highlight, sort_order) VALUES ($1, $2, $3)`,
              [expId, exp.highlights[j], j]
            );
          }
        }
      }

      // Insert education
      for (let i = 0; i < candidate.education.length; i++) {
        const edu = candidate.education[i];
        await pool.query(
          `INSERT INTO education (candidate_id, degree, institution, start_date, end_date, status, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            candidate.id,
            edu.degree,
            edu.institution,
            toDate(edu.startDate),
            toDate(edu.endDate),
            edu.status || null,
            i,
          ]
        );
      }

      // Insert certifications
      for (let i = 0; i < candidate.certifications.length; i++) {
        const cert = candidate.certifications[i];
        const year = typeof cert.year === 'string' ? parseInt(cert.year, 10) : cert.year;
        await pool.query(
          `INSERT INTO certifications (candidate_id, name, year, sort_order) VALUES ($1, $2, $3, $4)`,
          [candidate.id, cert.name, year || null, i]
        );
      }
    }
    console.log(`Seeded ${candidatesData.length} candidates`);

    // Load CV files for each candidate
    let filesSeeded = 0;
    for (const candidate of candidatesData) {
      if (candidate.cvFile) {
        const fileName = basename(candidate.cvFile);
        const filePath = join(cvsFolder, fileName);

        if (existsSync(filePath)) {
          const content = readFileSync(filePath);
          const mimeType = fileName.endsWith('.pdf')
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

          await pool.query(
            `INSERT INTO files (candidate_id, file_name, file_type, mime_type, content)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [candidate.id, fileName, 'cv', mimeType, content]
          );
          filesSeeded++;
        } else {
          console.warn(`CV file not found: ${filePath}`);
        }
      }
    }
    console.log(`Seeded ${filesSeeded} CV files`);

    // Load positions from Frontend JSON
    const positionsPath = process.env.POSITIONS_JSON || join(seedDataDir, 'positions.json');
    const positionsData = JSON.parse(readFileSync(positionsPath, 'utf-8')) as Position[];

    for (const position of positionsData) {
      // Insert position (without JSONB fields)
      await pool.query(
        `INSERT INTO positions (id, title, company, location, status, description, experience_years, work_type, salary, contact_name, contact_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           title = $2, company = $3, location = $4, status = $5, description = $6,
           experience_years = $7, work_type = $8, salary = $9, contact_name = $10, contact_email = $11,
           updated_at = NOW()`,
        [
          position.id,
          position.title,
          position.company,
          position.location,
          position.status,
          position.description,
          position.experienceYears,
          position.workType,
          position.salary || null,
          position.contactName,
          position.contactEmail,
        ]
      );

      // Clear existing related data for this position (for idempotency)
      await pool.query('DELETE FROM position_skills WHERE position_id = $1', [position.id]);
      await pool.query('DELETE FROM position_requirements WHERE position_id = $1', [position.id]);

      // Insert skills
      for (const skillName of position.skills) {
        const skillId = await getOrCreateSkill(skillName);
        await pool.query(
          `INSERT INTO position_skills (position_id, skill_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [position.id, skillId]
        );
      }

      // Insert requirements
      for (let i = 0; i < position.requirements.length; i++) {
        const req = position.requirements[i];
        await pool.query(
          `INSERT INTO position_requirements (position_id, text, required, sort_order) VALUES ($1, $2, $3, $4)`,
          [position.id, req.text, req.required, i]
        );
      }
    }
    console.log(`Seeded ${positionsData.length} positions`);

    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
