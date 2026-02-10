import bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import XLSX from 'xlsx';
import pool from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedDataDir = join(__dirname, '../seed-data');
const jobsFolder = join(seedDataDir, 'jobs');

// Excel row interface
interface JobRow {
  'Job #': number;
  'Job Title': string;
  'Hiring Manager': string;
  'Description File': string;
  [key: string]: unknown; // Candidate columns
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


/**
 * Parse job description .txt file (email-like format).
 * Returns sender, subject, and body.
 */
function parseJobFile(content: string): { sender: string; subject: string; body: string } {
  const lines = content.split('\n');
  let sender = '';
  let subject = '';
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('From:')) {
      sender = line.replace('From:', '').trim();
    } else if (line.startsWith('Subject:')) {
      subject = line.replace('Subject:', '').trim();
    } else if (line.trim() === '' && (sender || subject)) {
      bodyStart = i + 1;
      break;
    }
  }

  const body = lines.slice(bodyStart).join('\n').trim();
  return { sender, subject, body };
}

/**
 * Extract structured fields from job description text.
 */
function extractJobFields(text: string): {
  location: string | null;
  workType: string | null;
  experienceYears: number | null;
  salary: string | null;
} {
  // Location patterns
  const locationMatch = text.match(/(?:Tel Aviv|Haifa|Jerusalem|Ramat Gan|Herzliya|Netanya|Beer Sheva|Remote)/i);
  const location = locationMatch ? locationMatch[0] : null;

  // Work type patterns
  const workTypeMatch = text.match(/\b(remote|hybrid|on-?site|onsite)\b/i);
  let workType: string | null = null;
  if (workTypeMatch) {
    const wt = workTypeMatch[1].toLowerCase();
    if (wt === 'remote') workType = 'remote';
    else if (wt === 'hybrid') workType = 'hybrid';
    else workType = 'onsite';
  }

  // Experience years patterns - match "X+ years" followed by anything with "experience"
  const expMatch = text.match(/(\d+)\+?\s*years?[^.]*(?:experience|DevOps|engineer)/i);
  const experienceYears = expMatch ? parseInt(expMatch[1], 10) : 0;

  // Salary patterns (optional)
  const salaryMatch = text.match(/(?:salary|compensation)[:\s]*([^\n]+)/i);
  const salary = salaryMatch ? salaryMatch[1].trim() : null;

  return { location, workType, experienceYears, salary };
}

/**
 * Extract skills mentioned in text by matching against common DevOps skills.
 */
function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    'AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'Ansible',
    'Jenkins', 'GitLab CI', 'GitHub Actions', 'CircleCI', 'ArgoCD',
    'Python', 'Go', 'Bash', 'Linux', 'Prometheus', 'Grafana', 'ELK',
    'Helm', 'Istio', 'Vault', 'Consul', 'Kafka', 'Redis', 'PostgreSQL',
    'MySQL', 'MongoDB', 'Elasticsearch', 'Datadog', 'New Relic', 'Splunk',
    'CloudFormation', 'Pulumi', 'Chef', 'Puppet', 'SaltStack', 'Nginx',
    'HAProxy', 'CI/CD', 'IaC', 'Microservices', 'REST API', 'gRPC',
  ];

  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const skill of commonSkills) {
    if (lowerText.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  }

  return [...new Set(found)]; // Remove duplicates
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

    // Load positions from Excel file
    const excelPath = join(jobsFolder, 'jobs.xlsx');
    if (!existsSync(excelPath)) {
      throw new Error(`Excel file not found: ${excelPath}`);
    }

    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    let positionsSeeded = 0;

    for (const row of rows) {
      const jobNum = row['Job #'] as number;
      const jobTitle = row['Job Title'] as string;
      const hiringManager = row['Hiring Manager'] as string;
      const descriptionFile = row['Description File'] as string;

      if (!descriptionFile) continue;

      // Read the job description .txt file
      const txtPath = join(jobsFolder, descriptionFile);
      if (!existsSync(txtPath)) {
        console.warn(`Job description file not found: ${txtPath}`);
        continue;
      }

      const txtContent = readFileSync(txtPath, 'utf-8');
      const { sender, subject, body } = parseJobFile(txtContent);
      const { location, workType, experienceYears, salary } = extractJobFields(txtContent);
      const skills = extractSkillsFromText(txtContent);

      // Generate position ID
      const positionId = `pos_${String(jobNum).padStart(3, '0')}`;

      // Extract company from sender email or use default
      const companyMatch = sender.match(/@([^.]+)/);
      const company = companyMatch ? companyMatch[1].replace(/-/g, ' ') : 'Unknown Company';

      // Extract contact name from sender
      const nameMatch = sender.match(/^([^<]+)</);
      const contactName = nameMatch ? nameMatch[1].trim() : hiringManager.split('@')[0];
      const contactEmail = hiringManager;

      // Insert position
      await pool.query(
        `INSERT INTO positions (id, title, company, location, status, description, experience_years, work_type, salary, contact_name, contact_email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           title = $2, company = $3, location = $4, status = $5, description = $6,
           experience_years = $7, work_type = $8, salary = $9, contact_name = $10, contact_email = $11,
           updated_at = NOW()`,
        [
          positionId,
          jobTitle,
          company,
          location || 'Israel',
          'open',
          body,
          experienceYears,
          workType || 'hybrid',
          salary,
          contactName,
          contactEmail,
        ]
      );

      // Clear existing skills for this position
      await pool.query('DELETE FROM position_skills WHERE position_id = $1', [positionId]);

      // Insert skills
      for (const skillName of skills) {
        const skillId = await getOrCreateSkill(skillName);
        await pool.query(
          `INSERT INTO position_skills (position_id, skill_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [positionId, skillId]
        );
      }

      positionsSeeded++;
    }

    console.log(`Seeded ${positionsSeeded} positions from Excel`);
    console.log('Seeding complete!');
  } catch (error) {
    console.error('Seeding error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

seed();
