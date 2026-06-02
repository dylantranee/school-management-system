const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sections = await prisma.course_Section.findMany();
  const subjects = await prisma.subject.findMany();
  const subjectIds = new Set(subjects.map(s => s.id));

  console.log(`Found ${sections.length} course sections and ${subjects.length} subjects.`);

  const orphans = [];
  for (const s of sections) {
    if (!subjectIds.has(s.subject_id)) {
      orphans.push(s);
    }
  }

  console.log('Orphaned Course Sections (subject_id not in Subject):', orphans);
}

main().catch(console.error).finally(() => prisma.$disconnect());
