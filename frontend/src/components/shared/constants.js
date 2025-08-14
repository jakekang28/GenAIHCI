// Shared constants and data for the Interview/HMW system

export const scenarioPersonaPairs = [
  {
    id: 1,
    tag : 'A',
    scenario: "She scrambles to log in to two different platforms on her phone while her toddler tugs at her leg—then realizes she just missed the assignment submission window.",
    description: "How can we redesign the experience having to hop between different platforms of to-do lists so that it makes her well-prepared and less overwhelmed?",
    persona: {
      name: "Sofia Nguyen",
      role: "Single Parent & Part-Time Evening Student",
      image: "👩‍🎓",
      description: "Holds a high-school diploma; returned to school for career advancement while raising two children alone."
    },
    context: "After a full day at her retail job, Sofia arrives home to dinner prep, homework questions from her 7-year-old, and a group project Zoom call."
  },
  {
    id: 2,
    tag : 'B',
    scenario: "Back home, Roberto finds receipts scattered across the kitchen counter and spends two hours typing them into three separate tools—by which time he's too exhausted to plan tomorrow's prep.",
    description: "How can we redesign the experience of manually recording sales and stocks that drains time and lead to frustration?",
    persona: {
      name: "Roberto Alvarez",
      role: "Independent Coffee Shop Owner",
      image: "👨‍💼",
      description: "Family-owned café operator for 15 years; just introduced a small catering service."
    },
    context: "A sudden lunch-rush catering order arrives just as he's closing the shop for the break time;  he scribbles notes on a receipt, then forgets key details by night's end."
  },
  {
    id: 3,
    tag : 'C',
    scenario: "She scribbles vital signs on paper, then pockets photos of the forms—later realizing several pages are blurry or misplaced.",
    description: "How can we redesign the experience of suffering from unreliable connectivity in rural places for health workers so that they don't feel anxious about missing something critical in their works?",
    persona: {
      name: "Fatima Hassan",
      role: "Community Health Outreach Worker",
      image: "👵",
      description: "Public-health graduate; drives between rural clinics to educate about nutrition and vaccinations."
    },
    context: "Visiting a remote village school, Fatima conducts check-ups for dozens of children but can't connect to the server to log their data on the spot."
  },
  {
    id: 4,
    tag : 'D',
    scenario: "He loses his place in the code, toggles through four apps to triage notifications, and wastes 20 minutes just re-orienting himself.",
    description: "How can we redesign the experience of coding in a startup for software developers so that they don't feel lost in an ocean of information? ",
    persona: {
      name: "Ethan Walker",
      role: "Junior Remote Software Developer",
      image: "👦",
      description: "Computer-science grad working from home for a distributed startup team."
    },
    context: "Mid-afternoon, Ethan's in the zone debugging a complex issue when three chat pings, two email threads, and a build-failure alert pop up simultaneously."
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
