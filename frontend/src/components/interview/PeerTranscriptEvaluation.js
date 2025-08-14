import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

const PeerTranscriptEvaluation = ({ 
  chatMessages, 
  selectedGroupQuestion, 
  selectedScenario, 
  onBack, 
  onContinue 
}) => {
  const [openDropdowns, setOpenDropdowns] = useState({});

  const toggleDropdown = (transcriptId, questionType) => {
    const dropdownKey = `${transcriptId}_${questionType}`;
    setOpenDropdowns(prev => ({
      ...prev,
      [dropdownKey]: !prev[dropdownKey]
    }));
  };

  const generateGroupmateTranscripts = () => {
    const yourResponses = chatMessages.filter(msg => msg.sender === 'ai').map(msg => msg.text);
    const yourFollowUps = chatMessages
      .filter(msg => msg.sender === 'user' && msg.text !== selectedGroupQuestion)
      .map(msg => msg.text);
    
    return [
      {
        id: 1,
        studentName: "Student A (You)",
        isYourTranscript: true,
        mainQuestion: selectedGroupQuestion,
        mainQuestionResponse: yourResponses[0] || "Thank you for that question. Let me share my perspective on this...",
        followUps: yourFollowUps.filter(q => q.trim()),
        followUpResponses: yourResponses.slice(1) || [
          "That's a really insightful follow-up. Let me elaborate on that aspect...",
          "You're touching on something important here. From my experience...",
          "That's exactly the kind of detail that helps me understand better..."
        ],
        insights: []
      },
      {
        id: 2,
        studentName: "Student B",
        isYourTranscript: false,
        mainQuestion: selectedScenario?.id === 1 
          ? "How do you currently organize and prioritize your coursework across multiple online platforms?"
          : selectedScenario?.id === 2
          ? "What challenges do you face when trying to coordinate tasks with team members in different time zones?"
          : selectedScenario?.id === 3
          ? "How do you prefer to track and share your health information with healthcare providers?"
          : "What difficulties do you encounter when trying to stick to a budget as a college student?",
        mainQuestionResponse: selectedScenario?.id === 1
          ? "It's honestly pretty chaotic right now. I have Google Classroom for one course, Canvas for two others, and then my research advisor uses Slack for communication. I spend the first 30 minutes of every day just checking all these different platforms to see what's due and what's been updated. It's exhausting and I feel like I'm always missing something important."
          : selectedScenario?.id === 2
          ? "The biggest challenge is that when I send a message or email, I never know when people will see it. Like, I might need input on something by end of day, but half my team is just starting their workday when I'm wrapping up. We end up having these long email chains that take days to resolve something that could be figured out in a 10-minute conversation."
          : selectedScenario?.id === 3
          ? "Well, I'm still pretty new to all this digital stuff. My doctor gave me this blood pressure monitor that connects to an app, but honestly, I'm not sure if I'm using it right. The numbers show up on my phone, but I don't really know what they mean or if I should be worried. I'd rather just write things down on paper like I always have."
          : "I guess the biggest difficulty is that I never learned how to budget properly. My parents always handled money stuff, and now I'm on my own with a credit card and student loans. I try to keep track of what I spend, but then unexpected things come up like textbooks or my laptop breaking, and suddenly I'm way over whatever limit I thought I had.",
        followUps: [
          "Can you walk me through a typical day when this happens?",
          "How does that make you feel?",
          "What would need to change for this to work better for you?"
        ],
        followUpResponses: [
          selectedScenario?.id === 1
            ? "So yesterday was a perfect example. I woke up and checked my phone - three different notifications about assignments. One was due that day that I completely forgot about. I spent my morning panic-rushing through it instead of working on my research. Then I missed a discussion post deadline in another class because it was buried in a different system. By evening I felt completely scattered and behind on everything."
            : selectedScenario?.id === 2
            ? "Yesterday I needed feedback on a project proposal from my team leads in London and Singapore. I sent it Monday morning my time, heard back from London Tuesday, but Singapore didn't respond until Thursday their time, which was Wednesday night for me. By then the client call was Friday morning and we still weren't aligned. I ended up staying up until 2 AM to revise everything after getting Singapore's input."
            : selectedScenario?.id === 3
            ? "Yesterday morning I took my blood pressure like my doctor said, and the app showed some red numbers. I didn't know if that meant I should call the doctor right away or if it was normal for morning readings. I ended up worrying about it all day, but I felt silly calling the doctor's office for something that might be nothing. I wish I could just show the numbers to someone who could tell me if I need to be concerned."
            : "Yesterday I went to buy groceries and planned to spend $50, but then I remembered I needed laundry detergent and some other things. At checkout it was $87. Then I got a text that my car insurance payment bounced because I forgot it comes out mid-month. Now I'm stressed about overdraft fees and whether I have enough for rent next week.",
          selectedScenario?.id === 1
            ? "Frustrated and overwhelmed, honestly. Like I'm always playing catch-up instead of being proactive. I feel stupid for missing things, even though I know it's not really my fault that everything is so disorganized. Sometimes I wonder if I'm just not cut out for managing all this digital complexity."
            : selectedScenario?.id === 2
            ? "Really frustrated and kind of helpless. Like I'm trying to do my job well, but the system is working against me. I feel bad for my team too because I know they're dealing with the same thing. Sometimes I wonder if remote work is just inherently inefficient, or if we're missing some obvious solution."
            : selectedScenario?.id === 3
            ? "Anxious and a bit embarrassed, to be honest. I don't want to seem like I can't handle technology, but I also don't want to make mistakes with my health. It makes me feel old and out of touch, which isn't a good feeling. I wish there was someone patient who could sit with me and explain how all this works."
            : "Honestly, pretty anxious and kind of ashamed. I feel like everyone else my age has this figured out, and I'm just bad with money. It's embarrassing to be 20 years old and not know how to manage basic finances. Sometimes I avoid checking my bank account because I'm afraid of what I'll see.",
          selectedScenario?.id === 1
            ? "I think I need one central place where everything shows up. Not just a calendar, but actually integrated so I can see assignments, communications, and deadlines all in one view. And it needs to be smart enough to prioritize things for me and remind me when something is urgent. Basically, I need it to think ahead so I don't have to constantly worry about what I'm forgetting."
            : selectedScenario?.id === 2
            ? "We need better ways to work asynchronously but still stay connected. Maybe something that shows everyone's schedules and automatically suggests meeting times, or a system that routes urgent decisions to whoever is online right now instead of waiting for specific people. And clearer expectations about response times for different types of requests."
            : selectedScenario?.id === 3
            ? "I need something that explains what the numbers mean in plain English, right when I'm looking at them. Like, instead of just showing '145/90', it should say something like 'This is slightly high, but not an emergency. Talk to your doctor at your next appointment.' And maybe a simple way to share the important readings with my daughter so she can help me understand what to watch for."
            : "I think I need a system that teaches me as I go, not just tracks what I spend. Like, if I'm about to go over budget, it should warn me and maybe suggest what I could skip this month. And it should help me plan for those unexpected expenses by showing me patterns of what I typically spend beyond my basic budget."
        ],
        insights: ["Strong emotional probing", "Good progression from general to specific"]
      },
      {
        id: 3,
        studentName: "Student C",
        isYourTranscript: false,
        mainQuestion: selectedScenario?.id === 1 
          ? "Can you describe a recent time when you felt overwhelmed with your online coursework?"
          : selectedScenario?.id === 2
          ? "Tell me about a time when miscommunication affected your team's productivity."
          : selectedScenario?.id === 3
          ? "What concerns do you have about using technology to manage your health?"
          : "How do you decide what expenses are worth spending money on?",
        mainQuestionResponse: selectedScenario?.id === 1
          ? "Just last week, actually. I had three major assignments due within two days, all for different classes, and each professor had different submission requirements. One wanted it uploaded to Canvas, another through email, and the third through some third-party platform I'd never used before. I spent more time figuring out how to submit things than actually working on the content. I was up until 3 AM and still barely made the deadlines."
          : selectedScenario?.id === 2
          ? "A few weeks ago we were working on a major client presentation. I thought everyone understood that I was handling the technical specifications section, but it turned out my colleague in our Berlin office was also working on the same thing. We both spent hours on it, and when we tried to combine our work the day before the presentation, we realized we had completely different interpretations of what the client wanted. We had to scramble to create something coherent."
          : selectedScenario?.id === 3
          ? "My biggest concern is privacy, honestly. I don't really understand where all this health information goes or who can see it. When I connect my devices to apps, are insurance companies getting that data? Could it affect my coverage? And what if the technology breaks or gets hacked? I don't want my personal health information floating around the internet where anyone could access it."
          : "I think about whether it's something that will improve my life long-term versus just something I want in the moment. Like, I'll spend money on good shoes because I know they'll last and my feet won't hurt. But I try not to buy clothes just because they're trendy. I also think about whether it's something that will help me reach my goals - like I'll spend money on career development or networking events, but not on expensive dinners out every week.",
        followUps: [
          "What was going through your mind at that time?",
          "Who else was involved in this situation?",
          "What did you try to do about it?"
        ],
        followUpResponses: [
          selectedScenario?.id === 1
            ? "I was thinking 'This is ridiculous.' I felt like I was spending more energy navigating technology than actually learning. I started questioning whether online education was right for me, even though I know it's more convenient for my schedule. There was this voice in my head saying 'You're just not tech-savvy enough' which made me feel even worse."
            : selectedScenario?.id === 2
            ? "I was frustrated and confused. I kept thinking 'How did this happen?' We use all these collaboration tools supposedly to prevent exactly this kind of thing. I felt bad for wasting both our time, but also annoyed that our systems failed us. I was worried the client would think we were disorganized and unprofessional."
            : selectedScenario?.id === 3
            ? "I worry that I'm being paranoid, but I also think maybe I should be more careful. I see stories on the news about data breaches and identity theft, and I think about how vulnerable all this information makes me. I don't understand the technology well enough to know what's safe and what isn't, so I end up being cautious about everything."
            : "I'm usually thinking about my future self. Like, 'Will future me be grateful I spent this money or regretful?' I try to imagine myself in six months or a year and whether this purchase will seem worthwhile then. Sometimes I'll put things in my cart and then wait a day or two to see if I still want them.",
          selectedScenario?.id === 1
            ? "Nobody else was directly involved, which made it worse. If I had a study group or someone to ask for help, maybe it would have been easier. I felt very alone in trying to figure everything out. I did eventually call the IT help desk for one of the platforms, but they couldn't help with how to actually navigate the assignment requirements."
            : selectedScenario?.id === 2
            ? "My colleague in Berlin and I were both working on it, plus our project manager who should have been coordinating but was managing three other projects. The client was involved indirectly because we had to keep asking for clarifications, which probably made us look unprepared. The whole situation involved too many people with unclear roles."
            : selectedScenario?.id === 3
            ? "My doctor recommended these apps and devices, and my adult children think I should use them because they worry about me living alone. But I don't think any of them really understand my privacy concerns. They grew up with technology and are comfortable sharing everything online. I come from a generation where personal information was kept private."
            : "Usually I'll talk to my roommate or call my mom if it's a bigger purchase. They help me think through whether I really need something or if I'm just being impulsive. My mom is really good at asking questions like 'Where will you put it?' or 'When will you use it?' that help me be more realistic.",
          selectedScenario?.id === 1
            ? "I tried making a spreadsheet to track all the different requirements for each class, but it was so complicated that maintaining the spreadsheet became another task I was stressed about. I also tried setting up notifications on my phone, but then I was getting so many alerts that I started ignoring them all. Eventually I just brute-forced through it, but I knew that wasn't sustainable."
            : selectedScenario?.id === 2
            ? "I tried to salvage both pieces of work by finding ways to combine them, but they were structured completely differently. We ended up having an emergency video call at a terrible time for both our time zones to try to fix it. I suggested we put better communication protocols in place for future projects, but I'm not sure anything actually changed."
            : selectedScenario?.id === 3
            ? "I asked my doctor about privacy, but they didn't really have good answers - they just said the apps are 'secure.' I looked up the companies online to try to understand their privacy policies, but the legal language was impossible to understand. I'm still using some of the technology, but I'm very selective about what information I'm willing to share."
            : "I started using a budgeting app to track my spending patterns, which has been helpful. I also have a rule where I wait 24 hours before buying anything over $50. And I've started thinking more about cost per use - like, if something costs $100 but I'll use it every day for a year, that's better than something that costs $20 but I'll only use once."
        ],
        insights: ["Good use of storytelling", "Explored context well"]
      }
    ];
  };

  const groupmateTranscripts = generateGroupmateTranscripts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6 flex items-center justify-center">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center mb-8">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Transcript
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Peer Transcript Comparison</h1>
          <p className="text-gray-600 mb-4">
            Compare your interview transcript with your groupmates. Look at the different approaches 
            to follow-up questions and note what techniques were most effective.
          </p>

          <div className="space-y-6">
            {groupmateTranscripts.map((transcript, index) => (
              <div 
                key={transcript.id}
                className={`border-2 rounded-lg p-6 ${
                  transcript.isYourTranscript 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    {transcript.studentName}
                  </h3>
                  {transcript.isYourTranscript && (
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                      Your Transcript
                    </span>
                  )}
                </div>

                <div className="space-y-6">
                  {/* Main Question Section */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Main Question:</h4>
                    <div className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => toggleDropdown(transcript.id, 'main')}
                        className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span className="text-gray-700 break-words overflow-hidden flex-1 text-sm">
                          "{transcript.mainQuestion}"
                        </span>
                        {openDropdowns[`${transcript.id}_main`] ? (
                          <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                        )}
                      </button>
                      
                      {openDropdowns[`${transcript.id}_main`] && (
                        <div className="border-t border-gray-200 p-4 bg-blue-50">
                          <div className="flex items-start">
                            <div className="text-2xl mr-3 flex-shrink-0">{selectedScenario.persona.image}</div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-blue-800 mb-2">{selectedScenario.persona.name}'s Response:</h5>
                              <p className="text-blue-700 text-sm break-words overflow-hidden leading-relaxed">
                                {transcript.mainQuestionResponse}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/*Follow-up Questions Section*/}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Follow-up Questions:</h4>
                    <div className="space-y-3">
                      {transcript.followUps.map((question, qIndex) => (
                        <div key={qIndex} className="border border-gray-200 rounded-lg">
                          <button
                            onClick={() => toggleDropdown(transcript.id, `followup_${qIndex}`)}
                            className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
                          >
                            <span className="text-gray-700 break-words overflow-hidden flex-1 text-sm">
                              {qIndex + 1}. "{question}"
                            </span>
                            {openDropdowns[`${transcript.id}_followup_${qIndex}`] ? (
                              <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
                            )}
                          </button>
                          
                          {openDropdowns[`${transcript.id}_followup_${qIndex}`] && (
                            <div className="border-t border-gray-200 p-4 bg-green-50">
                              <div className="flex items-start">
                                <div className="text-2xl mr-3 flex-shrink-0">{selectedScenario.persona.image}</div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-green-800 mb-2">{selectedScenario.persona.name}'s Response:</h5>
                                  <p className="text-green-700 text-sm break-words overflow-hidden leading-relaxed">
                                    {transcript.followUpResponses && transcript.followUpResponses[qIndex] 
                                      ? transcript.followUpResponses[qIndex] 
                                      : "Response not available for this follow-up question."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-8">
            <button 
              onClick={onContinue}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center"
            >
              Continue to Final Evaluation
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeerTranscriptEvaluation;
