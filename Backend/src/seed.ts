import bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from 'path';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cvsFolder = join(__dirname, '../../CVsJobs/cvs');

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
  skills: unknown[];
  languages: string[];
  experience: unknown[];
  education: unknown[];
  certifications: unknown[];
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
  requirements: unknown[];
  skills: string[];
  experienceYears: number;
  workType: string;
  salary?: string;
  contactName: string;
  contactEmail: string;
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
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, name = $3`,
      ['admin@hellio.com', passwordHash, 'Admin']
    );
    console.log('Admin user created: admin@hellio.com');

    // Load candidates from Frontend JSON
    const candidatesPath = join(__dirname, '../../Frontend/src/data/candidates.json');
    const candidatesData = JSON.parse(readFileSync(candidatesPath, 'utf-8')) as Candidate[];

    for (const candidate of candidatesData) {
      await pool.query(
        `INSERT INTO candidates (id, name, email, phone, location, linkedin, github, status, summary, skills, languages, experience, education, certifications)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO UPDATE SET
           name = $2, email = $3, phone = $4, location = $5, linkedin = $6, github = $7,
           status = $8, summary = $9, skills = $10, languages = $11, experience = $12,
           education = $13, certifications = $14`,
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
          JSON.stringify(candidate.skills),
          JSON.stringify(candidate.languages),
          JSON.stringify(candidate.experience),
          JSON.stringify(candidate.education),
          JSON.stringify(candidate.certifications),
        ]
      );
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
    const positionsPath = join(__dirname, '../../Frontend/src/data/positions.json');
    const positionsData = JSON.parse(readFileSync(positionsPath, 'utf-8')) as Position[];

    for (const position of positionsData) {
      await pool.query(
        `INSERT INTO positions (id, title, company, location, status, description, requirements, skills, experience_years, work_type, salary, contact_name, contact_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           title = $2, company = $3, location = $4, status = $5, description = $6,
           requirements = $7, skills = $8, experience_years = $9, work_type = $10,
           salary = $11, contact_name = $12, contact_email = $13`,
        [
          position.id,
          position.title,
          position.company,
          position.location,
          position.status,
          position.description,
          JSON.stringify(position.requirements),
          JSON.stringify(position.skills),
          position.experienceYears,
          position.workType,
          position.salary || null,
          position.contactName,
          position.contactEmail,
        ]
      );
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
