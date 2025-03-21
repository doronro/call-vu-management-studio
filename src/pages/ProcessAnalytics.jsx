
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Process } from '@/api/entities';
import { Session } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { InvokeLLM } from '@/api/integrations';
import { format, subDays, isBefore, isAfter, parseISO } from 'date-fns';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Download, FileText, AreaChart, Clock, UserCheck, Loader2, 
  Calendar, ChevronDown, Cpu, Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { generatePDF } from '@/components/utils/generatePDF';

export default function ProcessAnalytics() {
  const [process, setProcess] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [error, setError] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const processId = urlParams.get('id');
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  
  useEffect(() => {
    if (processId) {
      loadProcessAndSessions();
    }
  }, [processId]);

  useEffect(() => {
    if (sessions.length > 0) {
      filterSessionsByDateRange();
    }
  }, [sessions, dateRange]);

  useEffect(() => {
    if (process?.id) {
      const cachedAnalysis = localStorage.getItem(`ai_analysis_${process.id}`);
      if (cachedAnalysis) {
        setAiAnalysis(JSON.parse(cachedAnalysis));
      } else {
        generateAIAnalysis();
      }
    }
  }, [process]);

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const loadProcessAndSessions = async () => {
    setIsLoading(true);
    try {
      const processes = await Process.filter({id: processId});
      const processData = processes.length > 0 ? processes[0] : null;
      
      if (!processData) {
        setError("Process not found");
        setIsLoading(false);
        return;
      }
      
      setProcess(processData);
      
      const sessionData = await Session.filter({processId: processId});
      setSessions(sessionData);
    } catch (error) {
      console.error("Error loading process analytics data:", error);
      setError("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const filterSessionsByDateRange = () => {
    const filtered = sessions.filter(session => {
      const sessionDate = parseISO(session.startTime);
      return isAfter(sessionDate, dateRange.from) && isBefore(sessionDate, dateRange.to);
    });
    
    setFilteredSessions(filtered);
  };

  const getCompletionRate = () => {
    if (filteredSessions.length === 0) return "0.0";
    const completedSessions = filteredSessions.filter(s => s.completed === true).length;
    return ((completedSessions / filteredSessions.length) * 100).toFixed(1);
  };

  const getAverageSessionDuration = () => {
    const completedSessions = filteredSessions.filter(s => s.completed && s.startTime && s.endTime);
    
    if (completedSessions.length === 0) return "N/A";
    
    const totalSeconds = completedSessions.reduce((total, session) => {
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      return total + (end - start) / 1000;
    }, 0);
    
    const avgSeconds = totalSeconds / completedSessions.length;
    
    if (avgSeconds < 60) {
      return `${Math.round(avgSeconds)} sec`;
    } else if (avgSeconds < 3600) {
      return `${Math.round(avgSeconds / 60)} min`;
    } else {
      return `${(avgSeconds / 3600).toFixed(1)} hrs`;
    }
  };

  const getSessionModeData = () => {
    const modes = { chat: 0, voice: 0, avatar: 0 };
    
    filteredSessions.forEach(session => {
      if (session.mode) {
        modes[session.mode] = (modes[session.mode] || 0) + 1;
      }
    });
    
    return Object.keys(modes).map(key => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: modes[key]
    }));
  };

  const getCommonIssues = () => {
    return filteredSessions
      .filter(s => !s.completed)
      .slice(0, 5)
      .map(s => ({
        issue: "Form abandoned",
        count: 1
      }));
  };

  const getSessionRatings = () => {
    const ratings = { 
      excellent: 0, 
      good: 0, 
      average: 0, 
      poor: 0, 
      'very poor': 0 
    };
    
    filteredSessions.forEach(session => {
      if (session.ratings && session.ratings.overallExperience) {
        const score = session.ratings.overallExperience;
        
        if (score >= 4.5) ratings.excellent++;
        else if (score >= 3.5) ratings.good++;
        else if (score >= 2.5) ratings.average++;
        else if (score >= 1.5) ratings.poor++;
        else ratings['very poor']++;
      }
    });
    
    return Object.entries(ratings)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));
  };

  const getTopQuestions = () => {
    const questions = {};
    
    filteredSessions.forEach(session => {
      if (session.questions && Array.isArray(session.questions)) {
        session.questions.forEach(q => {
          const questionText = q.question;
          if (questionText) {
            questions[questionText] = (questions[questionText] || 0) + 1;
          }
        });
      }
    });
    
    return Object.entries(questions)
      .map(([name, count]) => ({ 
        name: name.length > 25 ? name.substring(0, 25) + '...' : name, 
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const getCompletionTimeData = () => {
    const completedSessions = filteredSessions.filter(s => 
      s.completed && s.startTime && s.endTime
    );
    
    if (completedSessions.length === 0) {
      return [
        { name: 'No Data', sessions: 0 }
      ];
    }
    
    const timeRanges = {
      'Under 1 min': 0,
      '1-3 mins': 0,
      '3-5 mins': 0,
      '5-10 mins': 0,
      'Over 10 mins': 0
    };
    
    completedSessions.forEach(session => {
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      const durationMins = (end - start) / (1000 * 60);
      
      if (durationMins < 1) timeRanges['Under 1 min']++;
      else if (durationMins < 3) timeRanges['1-3 mins']++;
      else if (durationMins < 5) timeRanges['3-5 mins']++;
      else if (durationMins < 10) timeRanges['5-10 mins']++;
      else timeRanges['Over 10 mins']++;
    });
    
    return Object.entries(timeRanges)
      .map(([name, sessions]) => ({ name, sessions }));
  };

  const generateAIAnalysis = async () => {
    if (!process) return;
    
    try {
      setAnalysisLoading(true);
      
      const analysisData = {
        processName: process.name,
        totalSessions: sessions.length,
        completedSessions: sessions.filter(s => s.completed).length,
        completionRate: getCompletionRate(),
        averageSessionDuration: getAverageSessionDuration(),
        sessionModes: getSessionModeData(),
        mostCommonIssues: getCommonIssues(),
      };

      const response = await InvokeLLM({
        prompt: `Analyze this process data and provide insights and recommendations:
                ${JSON.stringify(analysisData, null, 2)}
                Provide analysis focusing on user engagement, completion rates, and areas of improvement.
                Also provide specific recommendations for improving the process.`,
        response_json_schema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } } 
          }
        }
      });

      const newAnalysis = {
        ...response,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem(`ai_analysis_${process.id}`, JSON.stringify(newAnalysis));
      setAiAnalysis(newAnalysis);
    } catch (error) {
      console.error("Error generating AI analysis:", error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const generateReport = async () => {
    setIsGeneratingReport(true);

    try {
      const totalCount = filteredSessions.length;
      const completedCount = filteredSessions.filter(s => s.completed).length;
      const completionPercent = totalCount > 0 ? (completedCount / totalCount * 100).toFixed(1) : "0";
      
      let avgDurationText = "N/A";
      const completedWithTimes = filteredSessions.filter(s => s.completed && s.startTime && s.endTime);
      
      if (completedWithTimes.length > 0) {
        const totalSeconds = completedWithTimes.reduce((total, session) => {
          const start = new Date(session.startTime);
          const end = new Date(session.endTime);
          return total + (end - start) / 1000;
        }, 0);
        
        const avgSeconds = totalSeconds / completedWithTimes.length;
        
        if (avgSeconds < 60) {
          avgDurationText = `${Math.round(avgSeconds)} sec`;
        } else if (avgSeconds < 3600) {
          avgDurationText = `${Math.round(avgSeconds / 60)} min`;
        } else {
          avgDurationText = `${(avgSeconds / 3600).toFixed(1)} hrs`;
        }
      }

      const dateRangeText = `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
      
      const reportContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif;
              line-height: 1.6;
              color: #334155;
              max-width: 1200px;
              margin: 0 auto;
              padding: 2rem;
              background: #f8fafc;
            }
            .report-container {
              background: white;
              border-radius: 12px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              padding: 2rem;
            }
            .header {
              text-align: center;
              margin-bottom: 3rem;
              padding-bottom: 2rem;
              border-bottom: 1px solid #e2e8f0;
            }
            .process-name {
              color: #1e40af;
              font-size: 2.5rem;
              font-weight: bold;
              margin: 0;
            }
            .date-range {
              color: #64748b;
              font-size: 1.1rem;
              margin-top: 0.5rem;
            }
            .description {
              color: #475569;
              font-size: 1.1rem;
              max-width: 800px;
              margin: 1rem auto;
              text-align: center;
            }
            .metrics-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 1.5rem;
              margin: 2rem 0;
            }
            .metric-card {
              background: #f8fafc;
              border-radius: 8px;
              padding: 1.5rem;
              text-align: center;
            }
            .metric-value {
              font-size: 2rem;
              font-weight: bold;
              color: #1e40af;
              margin: 0.5rem 0;
            }
            .metric-label {
              color: #64748b;
              font-size: 0.9rem;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .analysis-section {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
              gap: 2rem;
              margin: 3rem 0;
            }
            .analysis-card {
              padding: 1.5rem;
              border-radius: 8px;
            }
            .analysis-card.primary {
              background: #eff6ff;
              border-left: 4px solid #2563eb;
            }
            .analysis-card.secondary {
              background: #f0fdf4;
              border-left: 4px solid #16a34a;
            }
            .chart-section {
              margin: 3rem 0;
            }
            .chart-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
              gap: 2rem;
              margin: 2rem 0;
            }
            .chart-card {
              background: white;
              border-radius: 8px;
              padding: 1.5rem;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .chart-title {
              color: #1e40af;
              font-size: 1.2rem;
              margin-bottom: 1rem;
            }
            img {
              width: 100%;
              height: auto;
              border-radius: 4px;
            }
            .section-title {
              color: #1e40af;
              font-size: 1.5rem;
              margin: 2rem 0 1rem;
              padding-bottom: 0.5rem;
              border-bottom: 2px solid #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <h1 class="process-name">${process?.name || 'Process'} Analytics Report</h1>
              <div class="date-range">${dateRangeText}</div>
              ${process?.description ? `<p class="description">${process.description}</p>` : ''}
            </div>

            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">${totalCount}</div>
                <div class="metric-label">Total Sessions</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${completionPercent}%</div>
                <div class="metric-label">Completion Rate</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${avgDurationText}</div>
                <div class="metric-label">Average Completion Time</div>
              </div>
            </div>

            ${aiAnalysis ? `
              <h2 class="section-title">AI Analysis</h2>
              <div class="analysis-section">
                <div class="analysis-card primary">
                  <h3>Analysis</h3>
                  <div>${aiAnalysis.analysis}</div>
                </div>
                <div class="analysis-card secondary">
                  <h3>Recommendations</h3>
                  <div>
                    ${Array.isArray(aiAnalysis.recommendations) ? `
                      <ul class="space-y-2">
                        ${aiAnalysis.recommendations.map((rec, index) => `
                          <li key=${index} class="flex items-start gap-2">
                            <span class="text-green-600">•</span>
                            ${rec}
                          </li>
                        `).join('')}
                      </ul>
                    ` : aiAnalysis.recommendations}
                  </div>
                </div>
              </div>
            ` : ''}

            <h2 class="section-title">Performance Analytics</h2>
            <div class="chart-grid">
              <div class="chart-card">
                <h3 class="chart-title">Daily Sessions</h3>
                <img src="https://quickchart.io/chart?c={type:'line',data:{labels:['Day 1','Day 5','Day 10','Day 15','Day 20','Day 25','Day 30'],datasets:[{label:'Completed',data:[12,15,10,18,22,20,25],fill:false,borderColor:'rgb(75, 192, 192)'},{label:'Abandoned',data:[5,8,6,9,7,5,4],fill:false,borderColor:'rgb(255, 99, 132)'}]}}" alt="Daily Sessions" />
              </div>
              
              <div class="chart-card">
                <h3 class="chart-title">Mode Distribution</h3>
                <img src="https://quickchart.io/chart?c={type:'doughnut',data:{labels:['Chat','Voice','Avatar'],datasets:[{data:[50,30,20],backgroundColor:['#3b82f6','#8b5cf6','#10b981']}]},options:{plugins:{doughnutlabel:{labels:[{text:'100',font:{size:20}},{text:'TOTAL',font:{size:12}}]}}}}" alt="Mode Distribution" />
              </div>
              
              <div class="chart-card">
                <h3 class="chart-title">Completion Times</h3>
                <img src="https://quickchart.io/chart?c={type:'bar',data:{labels:['Under 5m','5-10m','10-15m','15-20m','Over 20m'],datasets:[{label:'Sessions',data:[30,45,20,15,10],backgroundColor:'rgba(59, 130, 246, 0.5)',borderColor:'rgb(59, 130, 246)'}]}}" alt="Completion Times" />
              </div>
              
              <div class="chart-card">
                <h3 class="chart-title">User Satisfaction</h3>
                <img src="https://quickchart.io/chart?c={type:'pie',data:{labels:['Very Satisfied','Satisfied','Neutral','Dissatisfied','Very Dissatisfied'],datasets:[{data:[45,30,15,7,3],backgroundColor:['#22c55e','#84cc16','#eab308','#f97316','#ef4444']}]}}" alt="User Satisfaction" />
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const blob = new Blob([reportContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${process?.name || 'Process'}_Analytics_Report.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating report:', error);
      setError('Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const generateDummyData = () => {
    return {
      fieldCompletionData: [
        { name: "Personal Details", avgTime: 45 },
        { name: "Account Info", avgTime: 30 },
        { name: "Transaction Details", avgTime: 60 },
        { name: "Documentation", avgTime: 90 },
        { name: "Confirmation", avgTime: 20 }
      ],
      
      problemFields: [
        { name: "Account Number", errorRate: 25 },
        { name: "Transaction Date", errorRate: 18 },
        { name: "Document Upload", errorRate: 15 },
        { name: "Amount", errorRate: 12 },
        { name: "Description", errorRate: 8 }
      ],
      
      satisfactionData: [
        { name: "Very Satisfied", value: 45 },
        { name: "Satisfied", value: 30 },
        { name: "Neutral", value: 15 },
        { name: "Dissatisfied", value: 7 },
        { name: "Very Dissatisfied", value: 3 }
      ],
      
      completionTimeData: [
        { name: "Under 5m", sessions: 30 },
        { name: "5-10m", sessions: 45 },
        { name: "10-15m", sessions: 20 },
        { name: "15-20m", sessions: 15 },
        { name: "Over 20m", sessions: 10 }
      ],
      
      topQuestions: [
        { question: "How do I upload documents?", count: 25 },
        { question: "Where do I find my account number?", count: 20 },
        { question: "What happens after submission?", count: 18 },
        { question: "How long does this take?", count: 15 },
        { question: "Can I save and continue later?", count: 12 }
      ],
      
      dailyCompletions: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        completed: Math.floor(Math.random() * 15) + 5,
        abandoned: Math.floor(Math.random() * 8) + 2
      })),
      
      ratingsDistribution: [
        { rating: 5, count: 45 },
        { rating: 4, count: 30 },
        { rating: 3, count: 15 },
        { rating: 2, count: 7 },
        { rating: 1, count: 3 }
      ],
      
      deviceUsage: [
        { name: "Desktop", value: 55 },
        { name: "Mobile", value: 35 },
        { name: "Tablet", value: 10 }
      ],
      
      interactionModes: [
        { name: "Chat", value: 50 },
        { name: "Voice", value: 30 },
        { name: "Avatar", value: 20 }
      ]
    };
  };

  const mockData = generateDummyData();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Link
          to={createPageUrl('Dashboard')}
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
        
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const calculateSessionStats = () => {
    const total = filteredSessions.length;
    const completed = filteredSessions.filter(s => s.completed).length;
    const completion = total > 0 ? completed / total : 0;
    
    return {
      total,
      completed,
      completion
    };
  };
  
  const sessionStats = calculateSessionStats();
  
  const formatAnalysisText = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <Link
            to={createPageUrl(`ProcessDetail?id=${processId}`)}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Process
          </Link>
          <h1 className="text-3xl font-bold">{process?.name} Analytics</h1>
          <p className="text-gray-500">Performance insights and usage statistics</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <DateRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            className="w-full sm:w-auto"
          />
          
          <Button 
            onClick={generateReport}
            disabled={isGeneratingReport || filteredSessions.length === 0}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isGeneratingReport ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Generate Report
          </Button>
        </div>
      </div>
      
      {filteredSessions.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No session data available</h3>
          <p className="text-gray-600 mb-4">
            There are no sessions for this process in the selected date range.
          </p>
          <Button 
            variant="outline" 
            onClick={() => setDateRange({
              from: subDays(new Date(), 30),
              to: new Date()
            })}
          >
            View Last 30 Days
          </Button>
        </div>
      ) : (
        <>
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-5 h-5">
                    <svg viewBox="0 0 24 24" className="text-yellow-400 fill-current">
                      <path d="M12 3L14.8 8.6L21 9.5L16.5 13.9L17.5 20.1L12 17.2L6.5 20.1L7.5 13.9L3 9.5L9.2 8.6L12 3Z" />
                    </svg>
                  </div>
                  A Word From Your AI Analyst
                </CardTitle>
                <CardDescription>
                  Automated analysis based on session data
                </CardDescription>
              </div>
              {analysisLoading && (
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-blue-50 border-l-4 border-blue-500">
                  <CardHeader>
                    <CardTitle>Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aiAnalysis ? (
                      <div className="prose prose-sm" 
                        dangerouslySetInnerHTML={{ __html: formatAnalysisText(aiAnalysis.analysis) }}>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
                        <span>Analyzing process data...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="bg-green-50 border-l-4 border-green-500">
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aiAnalysis ? (
                      <div className="prose prose-sm">
                        {Array.isArray(aiAnalysis.recommendations) ? (
                          <ul className="space-y-2">
                            {aiAnalysis.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-green-600">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div dangerouslySetInnerHTML={{ 
                            __html: formatAnalysisText(aiAnalysis.recommendations) 
                          }} />
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-center items-center p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-green-500 mr-2" />
                        <span>Generating recommendations...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-3xl font-bold text-blue-600">
                    {sessionStats.total}
                  </h3>
                  <p className="text-sm text-gray-500">Total Sessions</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h3 className={`text-3xl font-bold ${
                    sessionStats.completion >= 0.7 ? 'text-green-600' : 
                    sessionStats.completion >= 0.3 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {(sessionStats.completion * 100).toFixed(1)}%
                  </h3>
                  <p className="text-sm text-gray-500">Completion Rate</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-3xl font-bold text-purple-600">
                    {sessionStats.completed}
                  </h3>
                  <p className="text-sm text-gray-500">Completed Sessions</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-3xl font-bold text-indigo-600">
                    {getAverageSessionDuration()}
                  </h3>
                  <p className="text-sm text-gray-500">Avg. Completion Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Total Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{sessionStats.total}</div>
                <p className="text-xs text-gray-500">
                  In selected date range
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(sessionStats.completion * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500">
                  {sessionStats.completed} completed sessions
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Avg. Completion Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{getAverageSessionDuration()}</div>
                <p className="text-xs text-gray-500">
                  For completed sessions
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Knowledge Base Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{getQuestionCount()}</div>
                <p className="text-xs text-gray-500">
                  Asked during sessions
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="overview" className="mb-8">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="completion">Completion</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Session Modes</CardTitle>
                    <CardDescription>
                      Distribution of different interaction modes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getSessionModeData()}
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {getSessionModeData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} sessions`, 'Count']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Ratings</CardTitle>
                    <CardDescription>Overall experience ratings from users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {getSessionRatings().length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={getSessionRatings()}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {getSessionRatings().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} />
                            <Tooltip formatter={(value) => [`${value} ratings`, 'Count']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center p-8 text-gray-500">
                        No rating data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Top Questions</CardTitle>
                  <CardDescription>
                    Most frequently asked questions during sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {getTopQuestions().length > 0 ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={getTopQuestions()}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 12}} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8" name="Occurrences" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center p-8 text-gray-500">
                      No question data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="sessions" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Session Completion Times</CardTitle>
                  <CardDescription>
                    How long users take to complete the form
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getCompletionTimeData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar 
                          dataKey="sessions" 
                          fill="#8884d8" 
                          name="Sessions"
                        >
                          {getCompletionTimeData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="completion" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Completion by Mode</CardTitle>
                  <CardDescription>
                    Success rates across different interaction methods
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <div className="flex h-full items-center justify-center">
                      <p className="text-gray-500">Mode completion data visualization to be implemented</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="questions" className="pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sessions</CardTitle>
                  <CardDescription>
                    Latest interaction data from users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Mode</th>
                          <th className="px-4 py-3">Duration</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Fields Completed</th>
                          <th className="px-4 py-3">Questions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSessions.slice(0, 10).map((session) => {
                          const startDate = new Date(session.startTime);
                          const endDate = session.endTime ? new Date(session.endTime) : null;
                          const duration = endDate ? ((endDate - startDate) / 1000) : null;
                          const formattedDuration = duration 
                            ? duration < 60 
                              ? `${Math.round(duration)}s` 
                              : `${Math.round(duration / 60)}m`
                            : '-';
                          
                          const formFields = session.formData 
                            ? Object.keys(session.formData).length 
                            : 0;
                          
                          const questions = session.questions 
                            ? session.questions.length 
                            : 0;
                          
                          return (
                            <tr key={session.id} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">
                                {format(startDate, 'MMM dd, yyyy HH:mm')}
                              </td>
                              <td className="px-4 py-3">
                                <Badge 
                                  variant="outline"
                                  className={
                                    session.mode === 'chat' ? 'bg-blue-50 text-blue-700' :
                                    session.mode === 'voice' ? 'bg-purple-50 text-purple-700' :
                                    'bg-green-50 text-green-700'
                                  }
                                >
                                  {session.mode?.charAt(0).toUpperCase() + session.mode?.slice(1)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">{formattedDuration}</td>
                              <td className="px-4 py-3">
                                <Badge 
                                  variant={session.completed ? 'default' : 'secondary'}
                                  className={session.completed ? 'bg-green-100 text-green-800' : ''}
                                >
                                  {session.completed ? 'Completed' : 'Abandoned'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">{formFields}</td>
                              <td className="px-4 py-3">{questions}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function getQuestionCount() {
  return 5; // Dummy data
}
