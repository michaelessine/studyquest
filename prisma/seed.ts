/**
 * Seed — topic-based skill tree for 5 subjects.
 * Tier 0 nodes start unlocked; all others start locked.
 * Run with: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type TopicDef = { name: string; tier: number; prereqs: string[] }

// ── Subject topic definitions ─────────────────────────────────────────────────

const MATHEMATICS: TopicDef[] = [
  // Tier 0
  { name: 'Differential calculus',     tier: 0, prereqs: [] },
  { name: 'Integral calculus',         tier: 0, prereqs: [] },
  { name: 'Discrete mathematics',      tier: 0, prereqs: [] },
  { name: 'Linear algebra',            tier: 0, prereqs: [] },
  { name: 'Probability theory',        tier: 0, prereqs: [] },
  { name: 'Statistics',                tier: 0, prereqs: [] },
  { name: 'Number theory',             tier: 0, prereqs: [] },
  { name: 'Combinatorics',             tier: 0, prereqs: [] },
  // Tier 1
  { name: 'ODE',                       tier: 1, prereqs: ['Differential calculus', 'Integral calculus'] },
  { name: 'Real analysis',             tier: 1, prereqs: ['Integral calculus', 'Linear algebra'] },
  { name: 'Abstract algebra',          tier: 1, prereqs: ['Discrete mathematics'] },
  { name: 'Numerical analysis',        tier: 1, prereqs: ['Linear algebra', 'Integral calculus'] },
  { name: 'Graph theory',              tier: 1, prereqs: ['Discrete mathematics'] },
  { name: 'Matrix theory',             tier: 1, prereqs: ['Linear algebra'] },
  { name: 'Multivariable calculus',    tier: 1, prereqs: ['Integral calculus'] },
  { name: 'Linear optimization',       tier: 1, prereqs: ['Linear algebra'] },
  { name: 'Metric spaces',             tier: 1, prereqs: ['Real analysis'] },
  // Tier 2
  { name: 'PDE',                       tier: 2, prereqs: ['ODE', 'Multivariable calculus'] },
  { name: 'Complex analysis',          tier: 2, prereqs: ['Real analysis'] },
  { name: 'General topology',          tier: 2, prereqs: ['Metric spaces'] },
  { name: 'Fourier analysis',          tier: 2, prereqs: ['PDE', 'Real analysis'] },
  { name: 'Measure and integral',      tier: 2, prereqs: ['Real analysis'] },
  { name: 'Stochastic processes',      tier: 2, prereqs: ['Probability theory', 'Real analysis'] },
  { name: 'Nonlinear optimization',    tier: 2, prereqs: ['Linear optimization'] },
  { name: 'Dynamic optimization',      tier: 2, prereqs: ['Linear optimization', 'ODE'] },
  { name: 'Operations research',       tier: 2, prereqs: ['Linear optimization'] },
  { name: 'Multivariate statistical analysis', tier: 2, prereqs: ['Statistics', 'Linear algebra'] },
  { name: 'Numerical matrix computations',     tier: 2, prereqs: ['Numerical analysis', 'Matrix theory'] },
  { name: 'Cryptography',              tier: 2, prereqs: ['Number theory', 'Abstract algebra'] },
  { name: 'Differential geometry',     tier: 2, prereqs: ['Multivariable calculus', 'Linear algebra'] },
  { name: 'Time series analysis',      tier: 2, prereqs: ['Statistics', 'Stochastic processes'] },
  { name: 'Risk analysis',             tier: 2, prereqs: ['Probability theory', 'Statistics'] },
  // Tier 3
  { name: 'Functional analysis',       tier: 3, prereqs: ['Measure and integral', 'Metric spaces'] },
  { name: 'Hilbert spaces',            tier: 3, prereqs: ['Functional analysis'] },
  { name: 'Banach spaces',             tier: 3, prereqs: ['Functional analysis'] },
  { name: 'Harmonic analysis',         tier: 3, prereqs: ['Fourier analysis', 'Measure and integral'] },
  { name: 'High-dimensional probability',      tier: 3, prereqs: ['Measure and integral', 'Stochastic processes'] },
  { name: 'High-dimensional statistics',       tier: 3, prereqs: ['Multivariate statistical analysis', 'High-dimensional probability'] },
  { name: 'Computational inverse problems',    tier: 3, prereqs: ['Numerical analysis', 'PDE'] },
  { name: 'Computational methods in stochastics', tier: 3, prereqs: ['Stochastic processes', 'Numerical analysis'] },
  { name: 'Combinatorial optimization', tier: 3, prereqs: ['Graph theory', 'Linear optimization'] },
  { name: 'Algebraic topology',        tier: 3, prereqs: ['General topology', 'Abstract algebra'] },
  { name: 'Galois theory',             tier: 3, prereqs: ['Abstract algebra'] },
  { name: 'Lie groups and Lie algebras', tier: 3, prereqs: ['Abstract algebra', 'Differential geometry'] },
  { name: 'Brownian motion and stochastic analysis', tier: 3, prereqs: ['Stochastic processes', 'Measure and integral'] },
  { name: 'Variational calculus',      tier: 3, prereqs: ['ODE', 'Multivariable calculus'] },
  // Tier 4
  { name: 'Algebraic geometry',        tier: 4, prereqs: ['Galois theory', 'Complex analysis'] },
  { name: 'Representation theory',     tier: 4, prereqs: ['Lie groups and Lie algebras', 'Abstract algebra'] },
  { name: 'Spectral theory',           tier: 4, prereqs: ['Hilbert spaces', 'Functional analysis'] },
  { name: 'Random matrix theory',      tier: 4, prereqs: ['High-dimensional probability', 'Matrix theory'] },
  { name: 'Mathematical finance theory', tier: 4, prereqs: ['Stochastic processes', 'Measure and integral'] },
  { name: 'Quantum probability',       tier: 4, prereqs: ['Hilbert spaces', 'Probability theory'] },
  { name: 'Topological data analysis', tier: 4, prereqs: ['Algebraic topology', 'Statistics'] },
]

const COMPUTER_SCIENCE: TopicDef[] = [
  // Tier 0
  { name: 'Programming fundamentals',  tier: 0, prereqs: [] },
  { name: 'Data structures',           tier: 0, prereqs: [] },
  { name: 'Discrete mathematics',      tier: 0, prereqs: [] },
  { name: 'Computer architecture',     tier: 0, prereqs: [] },
  { name: 'Linear algebra',            tier: 0, prereqs: [] },
  { name: 'Probability and statistics',tier: 0, prereqs: [] },
  { name: 'Calculus',                  tier: 0, prereqs: [] },
  // Tier 1
  { name: 'Algorithms',                tier: 1, prereqs: ['Data structures', 'Discrete mathematics'] },
  { name: 'Operating systems',         tier: 1, prereqs: ['Computer architecture', 'Programming fundamentals'] },
  { name: 'Computer networks',         tier: 1, prereqs: ['Computer architecture'] },
  { name: 'Database systems',          tier: 1, prereqs: ['Programming fundamentals', 'Discrete mathematics'] },
  { name: 'Software engineering',      tier: 1, prereqs: ['Programming fundamentals'] },
  { name: 'Automata theory',           tier: 1, prereqs: ['Discrete mathematics'] },
  { name: 'Numerical methods',         tier: 1, prereqs: ['Calculus', 'Linear algebra'] },
  { name: 'Machine learning fundamentals', tier: 1, prereqs: ['Linear algebra', 'Probability and statistics'] },
  // Tier 2
  { name: 'Advanced algorithms',       tier: 2, prereqs: ['Algorithms'] },
  { name: 'Distributed systems',       tier: 2, prereqs: ['Operating systems', 'Computer networks'] },
  { name: 'Compiler design',           tier: 2, prereqs: ['Automata theory', 'Programming fundamentals'] },
  { name: 'Computer graphics',         tier: 2, prereqs: ['Linear algebra', 'Algorithms'] },
  { name: 'Cryptography',              tier: 2, prereqs: ['Discrete mathematics', 'Algorithms'] },
  { name: 'Natural language processing', tier: 2, prereqs: ['Machine learning fundamentals', 'Probability and statistics'] },
  { name: 'Computer vision',           tier: 2, prereqs: ['Machine learning fundamentals', 'Linear algebra'] },
  { name: 'Information retrieval',     tier: 2, prereqs: ['Algorithms', 'Probability and statistics'] },
  { name: 'Parallel computing',        tier: 2, prereqs: ['Operating systems', 'Computer architecture'] },
  { name: 'Deep learning',             tier: 2, prereqs: ['Machine learning fundamentals', 'Calculus'] },
  { name: 'Computational complexity',  tier: 2, prereqs: ['Algorithms', 'Automata theory'] },
  { name: 'Game theory',               tier: 2, prereqs: ['Probability and statistics', 'Algorithms'] },
  // Tier 3
  { name: 'Reinforcement learning',    tier: 3, prereqs: ['Deep learning', 'Probability and statistics'] },
  { name: 'Large language models',     tier: 3, prereqs: ['Deep learning', 'Natural language processing'] },
  { name: 'Quantum computing',         tier: 3, prereqs: ['Linear algebra', 'Computational complexity'] },
  { name: 'Distributed machine learning', tier: 3, prereqs: ['Deep learning', 'Distributed systems'] },
  { name: 'Formal verification',       tier: 3, prereqs: ['Automata theory', 'Compiler design'] },
  { name: 'Computational geometry',    tier: 3, prereqs: ['Algorithms', 'Computer graphics'] },
  { name: 'Graph neural networks',     tier: 3, prereqs: ['Deep learning', 'Algorithms'] },
  { name: 'Security and privacy',      tier: 3, prereqs: ['Cryptography', 'Operating systems'] },
  { name: 'Generative models',         tier: 3, prereqs: ['Deep learning', 'Probability and statistics'] },
  { name: 'Human-computer interaction', tier: 3, prereqs: ['Software engineering'] },
  // Tier 4
  { name: 'Foundation models',         tier: 4, prereqs: ['Large language models', 'Deep learning'] },
  { name: 'Algorithmic game theory',   tier: 4, prereqs: ['Game theory', 'Advanced algorithms'] },
  { name: 'Cryptographic protocols',   tier: 4, prereqs: ['Cryptography', 'Security and privacy'] },
  { name: 'Autonomous systems',        tier: 4, prereqs: ['Reinforcement learning', 'Computer vision'] },
  { name: 'Neuro-symbolic AI',         tier: 4, prereqs: ['Large language models', 'Formal verification'] },
]

const FINANCE: TopicDef[] = [
  // Tier 0
  { name: 'Financial accounting',      tier: 0, prereqs: [] },
  { name: 'Microeconomics',            tier: 0, prereqs: [] },
  { name: 'Macroeconomics',            tier: 0, prereqs: [] },
  { name: 'Statistics',                tier: 0, prereqs: [] },
  { name: 'Linear algebra',            tier: 0, prereqs: [] },
  { name: 'Calculus',                  tier: 0, prereqs: [] },
  { name: 'Time value of money',       tier: 0, prereqs: [] },
  // Tier 1
  { name: 'Corporate finance',         tier: 1, prereqs: ['Financial accounting', 'Time value of money'] },
  { name: 'Investments and portfolio theory', tier: 1, prereqs: ['Statistics', 'Time value of money'] },
  { name: 'Financial markets',         tier: 1, prereqs: ['Microeconomics', 'Financial accounting'] },
  { name: 'Econometrics',              tier: 1, prereqs: ['Statistics', 'Linear algebra'] },
  { name: 'Fixed income securities',   tier: 1, prereqs: ['Time value of money', 'Financial markets'] },
  { name: 'Financial statement analysis', tier: 1, prereqs: ['Financial accounting'] },
  { name: 'Probability theory',        tier: 1, prereqs: ['Statistics'] },
  // Tier 2
  { name: 'Derivatives and options',   tier: 2, prereqs: ['Investments and portfolio theory', 'Calculus'] },
  { name: 'Risk management',           tier: 2, prereqs: ['Investments and portfolio theory', 'Probability theory'] },
  { name: 'Asset pricing',             tier: 2, prereqs: ['Investments and portfolio theory', 'Econometrics'] },
  { name: 'Behavioral finance',        tier: 2, prereqs: ['Investments and portfolio theory', 'Microeconomics'] },
  { name: 'International finance',     tier: 2, prereqs: ['Financial markets', 'Macroeconomics'] },
  { name: 'Financial modeling',        tier: 2, prereqs: ['Corporate finance', 'Financial statement analysis', 'Econometrics'] },
  { name: 'Credit risk',               tier: 2, prereqs: ['Risk management', 'Fixed income securities'] },
  { name: 'Market microstructure',     tier: 2, prereqs: ['Financial markets', 'Investments and portfolio theory'] },
  // Tier 3
  { name: 'Stochastic calculus',       tier: 3, prereqs: ['Calculus', 'Probability theory'] },
  { name: 'Options pricing theory',    tier: 3, prereqs: ['Derivatives and options', 'Stochastic calculus'] },
  { name: 'Quantitative risk management', tier: 3, prereqs: ['Risk management', 'Econometrics'] },
  { name: 'Private equity and venture capital', tier: 3, prereqs: ['Corporate finance', 'Financial modeling'] },
  { name: 'Alternative investments',   tier: 3, prereqs: ['Asset pricing', 'Risk management'] },
  { name: 'Algorithmic trading',       tier: 3, prereqs: ['Market microstructure', 'Econometrics'] },
  { name: 'Financial regulation',      tier: 3, prereqs: ['Financial markets', 'Corporate finance'] },
  // Tier 4
  { name: 'High-frequency trading',    tier: 4, prereqs: ['Algorithmic trading', 'Market microstructure'] },
  { name: 'Systematic investment strategies', tier: 4, prereqs: ['Algorithmic trading', 'Asset pricing'] },
  { name: 'Structured products',       tier: 4, prereqs: ['Options pricing theory', 'Credit risk'] },
  { name: 'Machine learning in finance', tier: 4, prereqs: ['Algorithmic trading', 'Quantitative risk management'] },
  { name: 'FinTech and digital assets', tier: 4, prereqs: ['Financial markets', 'Financial regulation'] },
]

const ECONOMICS: TopicDef[] = [
  // Tier 0
  { name: 'Microeconomics',            tier: 0, prereqs: [] },
  { name: 'Macroeconomics',            tier: 0, prereqs: [] },
  { name: 'Statistics',                tier: 0, prereqs: [] },
  { name: 'Calculus',                  tier: 0, prereqs: [] },
  { name: 'Linear algebra',            tier: 0, prereqs: [] },
  // Tier 1
  { name: 'Intermediate microeconomics', tier: 1, prereqs: ['Microeconomics', 'Calculus'] },
  { name: 'Intermediate macroeconomics', tier: 1, prereqs: ['Macroeconomics', 'Calculus'] },
  { name: 'Econometrics',              tier: 1, prereqs: ['Statistics', 'Linear algebra'] },
  { name: 'Game theory',               tier: 1, prereqs: ['Microeconomics', 'Calculus'] },
  { name: 'Public economics',          tier: 1, prereqs: ['Microeconomics'] },
  { name: 'Labor economics',           tier: 1, prereqs: ['Microeconomics'] },
  { name: 'Development economics',     tier: 1, prereqs: ['Macroeconomics'] },
  { name: 'International economics',   tier: 1, prereqs: ['Macroeconomics', 'Microeconomics'] },
  // Tier 2
  { name: 'Advanced microeconomics',   tier: 2, prereqs: ['Intermediate microeconomics', 'Game theory'] },
  { name: 'Advanced macroeconomics',   tier: 2, prereqs: ['Intermediate macroeconomics', 'Econometrics'] },
  { name: 'Industrial organization',   tier: 2, prereqs: ['Intermediate microeconomics', 'Game theory'] },
  { name: 'Behavioral economics',      tier: 2, prereqs: ['Intermediate microeconomics', 'Game theory'] },
  { name: 'Environmental economics',   tier: 2, prereqs: ['Intermediate microeconomics', 'Public economics'] },
  { name: 'Health economics',          tier: 2, prereqs: ['Intermediate microeconomics', 'Public economics'] },
  { name: 'Urban and regional economics', tier: 2, prereqs: ['Intermediate microeconomics', 'Labor economics'] },
  { name: 'Political economy',         tier: 2, prereqs: ['Game theory', 'Public economics'] },
  { name: 'Financial economics',       tier: 2, prereqs: ['Intermediate microeconomics', 'Econometrics'] },
  { name: 'Information economics',     tier: 2, prereqs: ['Advanced microeconomics', 'Game theory'] },
  // Tier 3
  { name: 'General equilibrium theory', tier: 3, prereqs: ['Advanced microeconomics'] },
  { name: 'Dynamic macroeconomics',    tier: 3, prereqs: ['Advanced macroeconomics'] },
  { name: 'Experimental economics',    tier: 3, prereqs: ['Behavioral economics', 'Econometrics'] },
  { name: 'Mechanism design',          tier: 3, prereqs: ['Advanced microeconomics', 'Game theory'] },
  { name: 'Trade theory',              tier: 3, prereqs: ['International economics', 'Advanced microeconomics'] },
  { name: 'Causal inference',          tier: 3, prereqs: ['Econometrics', 'Experimental economics'] },
  { name: 'Computational economics',   tier: 3, prereqs: ['Advanced microeconomics', 'Econometrics'] },
  // Tier 4
  { name: 'Auction theory',            tier: 4, prereqs: ['Mechanism design', 'Game theory'] },
  { name: 'Contract theory',           tier: 4, prereqs: ['Mechanism design', 'Information economics'] },
  { name: 'Economic growth theory',    tier: 4, prereqs: ['Dynamic macroeconomics', 'General equilibrium theory'] },
  { name: 'Matching theory',           tier: 4, prereqs: ['Mechanism design', 'Game theory'] },
  { name: 'Market design',             tier: 4, prereqs: ['Auction theory', 'Matching theory'] },
]

const QUANTUM_MECHANICS: TopicDef[] = [
  // Tier 0
  { name: 'Classical mechanics',       tier: 0, prereqs: [] },
  { name: 'Electromagnetism',          tier: 0, prereqs: [] },
  { name: 'Linear algebra',            tier: 0, prereqs: [] },
  { name: 'Calculus',                  tier: 0, prereqs: [] },
  { name: 'Differential equations',    tier: 0, prereqs: [] },
  { name: 'Probability and statistics',tier: 0, prereqs: [] },
  { name: 'Thermodynamics',            tier: 0, prereqs: [] },
  // Tier 1
  { name: 'Mathematical methods for physics', tier: 1, prereqs: ['Calculus', 'Differential equations', 'Linear algebra'] },
  { name: 'Analytical mechanics',      tier: 1, prereqs: ['Classical mechanics', 'Calculus'] },
  { name: 'Statistical mechanics',     tier: 1, prereqs: ['Thermodynamics', 'Probability and statistics'] },
  { name: 'Special relativity',        tier: 1, prereqs: ['Classical mechanics', 'Electromagnetism'] },
  { name: 'Optics and waves',          tier: 1, prereqs: ['Electromagnetism', 'Differential equations'] },
  // Tier 2
  { name: 'Quantum mechanics I',       tier: 2, prereqs: ['Mathematical methods for physics', 'Classical mechanics', 'Linear algebra'] },
  { name: 'Solid state physics',       tier: 2, prereqs: ['Statistical mechanics', 'Quantum mechanics I'] },
  { name: 'Atomic and molecular physics', tier: 2, prereqs: ['Quantum mechanics I'] },
  { name: 'Nuclear physics',           tier: 2, prereqs: ['Quantum mechanics I', 'Special relativity'] },
  { name: 'Electrodynamics',           tier: 2, prereqs: ['Electromagnetism', 'Special relativity'] },
  { name: 'Quantum statistical mechanics', tier: 2, prereqs: ['Statistical mechanics', 'Quantum mechanics I'] },
  // Tier 3
  { name: 'Quantum mechanics II',      tier: 3, prereqs: ['Quantum mechanics I'] },
  { name: 'Quantum field theory',      tier: 3, prereqs: ['Quantum mechanics II', 'Electrodynamics'] },
  { name: 'Condensed matter physics',  tier: 3, prereqs: ['Solid state physics', 'Quantum mechanics II'] },
  { name: 'Quantum optics',            tier: 3, prereqs: ['Quantum mechanics II', 'Optics and waves'] },
  { name: 'Quantum information theory', tier: 3, prereqs: ['Quantum mechanics II', 'Linear algebra'] },
  { name: 'General relativity',        tier: 3, prereqs: ['Electrodynamics', 'Differential equations'] },
  { name: 'Many-body theory',          tier: 3, prereqs: ['Quantum mechanics II', 'Quantum statistical mechanics'] },
  // Tier 4
  { name: 'Quantum computing',         tier: 4, prereqs: ['Quantum information theory', 'Quantum mechanics II'] },
  { name: 'String theory and quantum gravity', tier: 4, prereqs: ['Quantum field theory', 'General relativity'] },
  { name: 'Topological phases of matter', tier: 4, prereqs: ['Condensed matter physics', 'Quantum field theory'] },
  { name: 'Quantum error correction',  tier: 4, prereqs: ['Quantum computing', 'Quantum information theory'] },
  { name: 'Advanced quantum field theory', tier: 4, prereqs: ['Quantum field theory', 'Many-body theory'] },
  { name: 'Particle physics',          tier: 4, prereqs: ['Quantum field theory'] },
]

// ── Generic subject seeder ────────────────────────────────────────────────────

async function seedSubject(subject: string, topics: TopicDef[]) {
  const nameToId = new Map<string, string>()

  for (const t of topics) {
    const node = await prisma.skillNode.create({
      data: {
        name:     t.name,
        subject,
        status:   t.tier === 0 ? 'unlocked' : 'locked',
        xpValue:  (t.tier + 1) * 100,
      },
    })
    nameToId.set(t.name, node.id)
  }

  for (const t of topics) {
    const depId = nameToId.get(t.name)!
    for (const prereqName of t.prereqs) {
      const prereqId = nameToId.get(prereqName)
      if (!prereqId) {
        console.warn(`  ⚠ Missing prereq "${prereqName}" for "${t.name}"`)
        continue
      }
      await prisma.skillDependency.create({
        data: { prerequisiteId: prereqId, dependentId: depId },
      })
    }
  }

  console.log(`  ✓ ${subject}: ${topics.length} topics seeded`)
}

// ── Sample courses (one per subject, for the Courses page) ────────────────────

async function seedCourses() {
  const courses = [
    { code: 'MATH 301', name: 'Real Analysis',           subject: 'Mathematics',      semester: 'Spring', year: 2025, status: 'active' },
    { code: 'CS 401',   name: 'Machine Learning',        subject: 'ComputerScience',  semester: 'Spring', year: 2025, status: 'active' },
    { code: 'FIN 301',  name: 'Corporate Finance',       subject: 'Finance',           semester: 'Spring', year: 2025, status: 'active' },
    { code: 'ECON 201', name: 'Intermediate Micro',      subject: 'Economics',         semester: 'Fall',   year: 2024, status: 'completed', grade: 3.7 },
    { code: 'PHYS 401', name: 'Quantum Mechanics I',     subject: 'QuantumMechanics', semester: 'Spring', year: 2025, status: 'active' },
  ]

  for (const c of courses) {
    await prisma.course.create({ data: c })
  }
  console.log(`  ✓ ${courses.length} sample courses seeded`)
}

// ── Session logs (establish a streak) ─────────────────────────────────────────

async function seedSessions() {
  const daysAgo = (n: number) => {
    const d = new Date(); d.setDate(d.getDate() - n); return d
  }
  await prisma.sessionLog.createMany({
    data: [
      { rawNote: 'Studied real analysis — sequences and limits', durationMins: 60, xpEarned: 20, loggedAt: daysAgo(2) },
      { rawNote: 'Worked through ML gradient descent examples',  durationMins: 90, xpEarned: 30, loggedAt: daysAgo(1) },
      { rawNote: 'Reviewed quantum mechanics postulates',        durationMins: 45, xpEarned: 15, loggedAt: daysAgo(0) },
    ],
  })
  console.log('  ✓ Session logs seeded')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding StudyQuest database...')

  // Wipe in dependency order
  await prisma.skillDependency.deleteMany()
  await prisma.achievement.deleteMany()
  await prisma.sessionLog.deleteMany()
  await prisma.deadline.deleteMany()
  await prisma.topic.deleteMany()
  await prisma.skillNode.deleteMany()
  await prisma.course.deleteMany()

  await seedSubject('Mathematics',     MATHEMATICS)
  await seedSubject('ComputerScience', COMPUTER_SCIENCE)
  await seedSubject('Finance',          FINANCE)
  await seedSubject('Economics',        ECONOMICS)
  await seedSubject('QuantumMechanics', QUANTUM_MECHANICS)

  await seedCourses()
  await seedSessions()

  // Seed achievement rows (unlocked state managed at runtime)
  await prisma.achievement.createMany({
    data: [
      { name: 'First Steps',    condition: 'Complete your first topic' },
      { name: 'On a Roll',      condition: 'Complete 10 topics' },
      { name: 'Tier 2 Reached', condition: 'Unlock a Tier 2 topic in any subject' },
      { name: 'Polymath',       condition: 'Complete topics in 3 different subjects' },
      { name: 'Deep Diver',     condition: 'Reach Tier 4 in any subject' },
    ],
  })
  console.log('  ✓ Achievement slots seeded')

  console.log('\n✅ Seed complete! Run `npm run dev` to start.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
