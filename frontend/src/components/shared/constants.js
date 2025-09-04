// Shared constants and data for the Interview/HMW system

export const scenarioPersonaPairs = [
  {
    id: 1,
    tag : 'A',
    scenario: "Sofia frantically switches between Canvas and Google Classroom on her phone while her toddler clings to her leg, only to discover she missed the 11:59 PM deadline for her group project submission.",
    description: "How can we make managing tasks across multiple platforms easier and less overwhelming?",
    persona: {
      name: "Sofia Nguyen",
      role: "Single Parent & Part-Time Evening Student",
      image: "👩‍🎓",
      description: "Holds a high-school diploma; returned to school for career advancement while raising two children alone."
    },
    context: "Sofia lives in a small apartment with her two children (ages 3 and 7). She works 30 hours per week at a retail store, attends evening classes three times a week, and manages all household responsibilities alone. Her limited free time is often interrupted by childcare needs, making it difficult to maintain consistent study schedules or participate fully in group projects."
  },
  {
    id: 2,
    tag : 'B',
    scenario: "Roberto sits at his kitchen table at 11 PM, surrounded by crumpled receipts and sticky notes, manually entering yesterday's sales data into three different spreadsheets while his wife asks when he'll come to bed.",
    description: "How can we make tracking daily sales and inventory less time-consuming and frustrating?",
    persona: {
      name: "Roberto Alvarez",
      role: "Independent Coffee Shop Owner",
      image: "👨‍💼",
      description: "Family-owned café operator for 15 years; just introduced a small catering service."
    },
    context: "Roberto operates a small neighborhood coffee shop that has been in his family for two generations. Recently, he expanded into catering services to increase revenue, but this has doubled his administrative workload. He manages inventory, staff scheduling, customer orders, and financial tracking using a mix of paper records, basic spreadsheets, and a simple POS system that don't communicate with each other."
  },
  {
    id: 3,
    tag : 'C',
    scenario: "Fatima stands in a dusty schoolyard, holding a stack of handwritten health forms that she photographed with her phone, knowing that half the images are too blurry to read and she won't have internet access for another three days.",
    description: "How can we help health workers in rural areas feel confident about their data collection when internet is unreliable?",
    persona: {
      name: "Fatima Hassan",
      role: "Community Health Outreach Worker",
      image: "👵",
      description: "Public-health graduate; drives between rural clinics to educate about nutrition and vaccinations."
    },
    context: "Fatima works for a regional health department, traveling to remote villages and rural schools to provide health screenings and education. She covers a territory of 200+ square miles with limited cellular coverage and unreliable internet access. Her work requires accurate record-keeping for patient follow-ups and health trend analysis, but she often must rely on paper forms and manual data entry when she returns to areas with connectivity."
  },
  {
    id: 4,
    tag : 'D',
    scenario: "Ethan stares at his screen, having just lost 20 minutes of debugging progress after being pulled into three different Slack channels, two urgent emails, and a failed deployment notification—now he can't remember where he left off in the code.",
    description: "How can we help software developers stay focused and organized when juggling multiple tools and notifications?",
    persona: {
      name: "Ethan Walker",
      role: "Junior Remote Software Developer",
      image: "👦",
      description: "Computer-science grad working from home for a distributed startup team."
    },
    context: "Ethan works remotely for a fast-growing tech startup with a distributed team across four time zones. His work involves frequent context-switching between coding, code reviews, team meetings, customer support tickets, and deployment monitoring. The company uses multiple communication tools (Slack, email, GitHub, Jira, Zoom) and has a culture of rapid iteration, which means constant interruptions and shifting priorities throughout his workday."
  }
];

export const mistakeTypes = [
  {
    id: 'closed_question',
    title: 'Closed Question',
    description: 'Yes/No or single-word responses that limit insight'
  },
  {
    id: 'too_broad',
    title: 'Too Broad/Abstract',
    description: 'Vague themes that lack specificity'
  },
  {
    id: 'premature_solution',
    title: 'Premature Solution',
    description: 'Introduces solutions before exploring user problems'
  },
  {
    id: 'double_barreled',
    title: 'Double-barreled',
    description: 'Combines two questions into one'
  },
  {
    id: 'leading_biased',
    title: 'Leading or Biased Framing',
    description: 'Suggests an answer or embeds assumptions'
  },
  {
    id: 'lacks_relevance',
    title: 'Lacks User Relevance',
    description: 'Does not connect clearly to the user experience or role'
  },
  {
    id: 'overly_narrow',
    title: 'Overly Narrow',
    description: 'Frames the problem so tightly that alternative insights are excluded'
  },
  {
    id: 'unclear_purpose',
    title: 'Unclear Purpose or Flow',
    description: 'The question does not fit logically in the sequence or does not relate to clear objectives'
  }
];

export const hmwRubrics = [
  {
    id: 'focus_on_user_needs',
    title: 'Focus on User Needs',
    description: 'Does the question clearly reflect a genuine user problem or need revealed during research?'
  },
  {
    id: 'open_endedness',
    title: 'Open-endedness',
    description: 'Does the question allow for a wide range of creative design directions, rather than implying a solution?'
  },
  {
    id: 'balance_of_specificity_and_generality',
    title: 'Balance of Specificity and Generality',
    description: 'Is the scope of the question narrow enough to be useful, but broad enough to inspire multiple ideas?'
  },
  {
    id: 'emotional_resonance',
    title: 'Emotional Resonance',
    description: "Does the question hint at the emotional or experiential aspect of the user's challenge?"
  }
];
