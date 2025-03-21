import { randomInt, randomDate, sample, randomFloat } from './utils';

export const generateDummySessions = (processId, processName, count) => {
  try {
    if (!processId) {
      console.error("Process ID is required to generate dummy sessions");
      return [];
    }
    
    const modes = ['chat', 'voice', 'avatar'];
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const sessions = [];
    
    // Define completion rate based on process
    let completionRate = 0.75; // Default 75%
    
    if (processName && processName.includes('Financial')) {
      completionRate = 0.82; // Financial process has 82% completion
    } else if (processName && processName.includes('Medical')) {
      completionRate = 0.68; // Medical process has 68% completion
    }
    
    console.log(`Generating ${count} sessions for process ${processName} (${processId}) with completion rate ${completionRate}`);
    
    for (let i = 0; i < count; i++) {
      const startTime = randomDate(thirtyDaysAgo, today);
      const mode = sample(modes) || 'chat'; // Default to chat if sample fails
      const completed = Math.random() < completionRate;
      
      // For completed sessions, add endTime and ratings
      let endTime = null;
      let ratings = null;
      let formData = {};
      
      if (completed) {
        // Session duration between 2 and 15 minutes
        const durationMs = (randomInt(2, 15) * 60 * 1000) + (randomInt(0, 59) * 1000);
        endTime = new Date(startTime.getTime() + durationMs);
        
        // Add ratings
        ratings = {
          overallExperience: randomInt(3, 5),
          easeOfUse: randomInt(3, 5),
          accuracy: randomInt(3, 5),
          comments: sample([
            "Easy to use process",
            "The voice assistant was helpful",
            "Would recommend this to others",
            "Some questions were confusing",
            "Great experience overall",
            ""
          ]) || ""
        };
        
        // Add form data
        if (processName && processName.includes('Financial')) {
          formData = {
            account_number: `ACCT-${randomInt(10000, 99999)}`,
            transaction_date: randomDate(new Date('2023-01-01'), new Date()).toISOString().split('T')[0],
            transaction_amount: (randomInt(10, 1000) + Math.random()).toFixed(2),
            dispute_reason: sample([
              'Unauthorized charge', 
              'Duplicate charge', 
              'Service not received', 
              'Incorrect amount', 
              'Other'
            ]) || 'Other',
            additional_details: sample([
              "I never made this purchase",
              "I was charged twice for the same item",
              "The amount is different than what I authorized",
              "I cancelled this service but was still charged",
              ""
            ]) || ""
          };
        } else if (processName && processName.includes('Medical')) {
          formData = {
            patient_name: sample([
              "John Smith", 
              "Sarah Johnson", 
              "Michael Lee", 
              "Emma Davis", 
              "Robert Wilson"
            ]) || "John Doe",
            date_of_birth: randomDate(new Date('1950-01-01'), new Date('2005-01-01')).toISOString().split('T')[0],
            symptoms: sample([
              "Fever and cough",
              "Back pain",
              "Headache",
              "Abdominal pain",
              "Difficulty breathing",
              "Fatigue"
            ]) || "General discomfort",
            duration: sample([
              "2 days", 
              "1 week", 
              "Several hours", 
              "3-4 days", 
              "Ongoing for months"
            ]) || "Few days",
            allergies: sample([
              "None", 
              "Penicillin", 
              "Peanuts", 
              "Lactose", 
              "Several - see medical record"
            ]) || "None"
          };
        } else {
          // Generic form data for any other process type
          formData = {
            field1: "Sample response",
            field2: randomInt(1, 100).toString(),
            field3: "Option " + randomInt(1, 5),
            notes: "This is sample data for testing"
          };
        }
      }
      
      // Generate some random questions for knowledge base
      const questionsCount = randomInt(0, 5);
      const questions = [];
      
      const possibleQuestions = processName && processName.includes('Financial') ? [
        "How long does the dispute process take?",
        "Will I get a temporary credit while you investigate?",
        "What documentation do I need to provide?",
        "Can I dispute a charge that's more than 60 days old?",
        "How will I be notified of the resolution?",
        "Can I check the status of my dispute online?",
        "Will this affect my credit score?",
        "What happens if my dispute is denied?"
      ] : [
        "How long will I wait to see a doctor?",
        "Do I need to bring my insurance card?",
        "Can I update my information online?",
        "What specialists are available at this facility?",
        "Do you offer telemedicine appointments?",
        "Are walk-ins accepted?",
        "Is there a copay for this visit?",
        "How do I access my test results?"
      ];
      
      for (let j = 0; j < questionsCount; j++) {
        if (possibleQuestions && possibleQuestions.length > 0) {
          const questionIndex = Math.min(
            randomInt(0, possibleQuestions.length - 1),
            possibleQuestions.length - 1
          );
          
          const question = possibleQuestions[questionIndex] || "General question about process";
          
          questions.push({
            question: question,
            answer: "I've found that information for you. Please see the details below.",
            timestamp: randomDate(startTime, endTime || today).toISOString(),
            source: Math.random() > 0.5 ? "knowledgebase" : "internet"
          });
        }
      }
      
      // Create the session object
      const session = {
        sessionId: `session_${Date.now()}_${i}`,
        processId: processId,
        mode: mode,
        startTime: startTime.toISOString(),
        endTime: endTime ? endTime.toISOString() : null,
        completed: completed,
        formData: formData,
        questions: questions,
        ratings: ratings,
        voiceMetrics: mode === 'voice' || mode === 'avatar' ? {
          totalUtterances: randomInt(5, 20),
          successfulRecognitions: randomInt(3, 18),
          failedRecognitions: randomInt(0, 5)
        } : null
      };
      
      sessions.push(session);
    }
    
    return sessions;
  } catch (error) {
    console.error("Error generating dummy sessions:", error);
    return [];
  }
};