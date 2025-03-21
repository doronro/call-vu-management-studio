
import React, { useState, useEffect } from 'react';
import { Session } from '@/api/entities';
import { Process } from '@/api/entities';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell 
} from 'recharts';
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Bot } from 'lucide-react';
import { InvokeLLM } from '@/api/integrations';
import { subDays } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Analytics() {
  const [processes, setProcesses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [analysis, setAnalysis] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [processesData, sessionsData] = await Promise.all([
        Process.list(),
        Session.list()
      ]);
      
      setProcesses(processesData);
      setSessions(sessionsData.filter(session => 
        new Date(session.startTime) >= dateRange.from &&
        new Date(session.startTime) <= dateRange.to
      ));
      
      generateAnalysis(processesData, sessionsData);
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnalysis = async (processes, sessions) => {
    try {
      const response = await InvokeLLM({
        prompt: `Analyze this form usage data and provide insights and improvement suggestions:
                Total Processes: ${processes.length}
                Total Sessions: ${sessions.length}
                Session Types: ${JSON.stringify(getSessionTypesBreakdown(sessions))}
                Completion Rate: ${getCompletionRate(sessions)}%
                Average Duration: ${getAverageDuration(sessions)} minutes`,
        response_json_schema: {
          type: "object",
          properties: {
            analysis: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });
      
      setAnalysis(response.analysis);
      setRecommendations(response.recommendations || []);
    } catch (error) {
      console.error("Error generating analysis:", error);
    }
  };

  const getSessionTypesBreakdown = (sessions) => {
    return sessions.reduce((acc, session) => {
      acc[session.mode] = (acc[session.mode] || 0) + 1;
      return acc;
    }, {});
  };

  const getCompletionRate = (sessions) => {
    if (sessions.length === 0) return 0;
    const completed = sessions.filter(s => s.completed).length;
    return ((completed / sessions.length) * 100).toFixed(1);
  };

  const getAverageDuration = (sessions) => {
    if (sessions.length === 0) return 0;
    const durations = sessions
      .filter(s => s.startTime && s.endTime)
      .map(s => new Date(s.endTime) - new Date(s.startTime));
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return (avg / (1000 * 60)).toFixed(1);
  };

  const generateReport = async () => {
    try {
      alert("Report generation started. The report will be downloaded shortly.");
      
      const processUsageData = processes.map(p => ({
        name: p.name,
        value: sessions.filter(s => s.processId === p.id).length
      }));

      const sessionTypesData = Object.entries(getSessionTypesBreakdown(sessions)).map(([key, value]) => ({
        name: key,
        value: value
      }));
      
      const processChartSvg = `
        <svg width="600" height="300" viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
          <style>
            .bar { fill: #4f46e5; }
            .bar:hover { fill: #7c3aed; }
            .label { font-family: sans-serif; font-size: 12px; }
            .axis { stroke: #ccc; stroke-width: 1; }
          </style>
          <line x1="50" y1="250" x2="580" y2="250" class="axis" />
          <line x1="50" y1="40" x2="50" y2="250" class="axis" />
          ${processUsageData.map((d, i) => {
            const barWidth = Math.min(80, 500 / processUsageData.length - 10);
            const barHeight = Math.max(1, d.value * 20);
            const x = 80 + i * (500 / processUsageData.length);
            const y = 250 - barHeight;
            return `
              <rect class="bar" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" />
              <text class="label" x="${x + barWidth/2}" y="270" text-anchor="middle">${d.name}</text>
              <text class="label" x="${x + barWidth/2}" y="${y - 5}" text-anchor="middle">${d.value}</text>
            `;
          }).join('')}
        </svg>
      `;
      
      const pieChartSvg = `
        <svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <style>
            .slice-0 { fill: #4f46e5; }
            .slice-1 { fill: #7c3aed; }
            .slice-2 { fill: #2563eb; }
            .label { font-family: sans-serif; font-size: 12px; fill: white; font-weight: bold; }
          </style>
          <g transform="translate(200, 200)">
            ${(() => {
              let total = sessionTypesData.reduce((sum, d) => sum + d.value, 0);
              if (total === 0) return '<circle cx="0" cy="0" r="100" fill="#ccc" />';
              
              let startAngle = 0;
              return sessionTypesData.map((d, i) => {
                const angle = (d.value / total) * 2 * Math.PI;
                const endAngle = startAngle + angle;
                
                const largeArcFlag = angle > Math.PI ? 1 : 0;
                const x1 = Math.cos(startAngle) * 100;
                const y1 = Math.sin(startAngle) * 100;
                const x2 = Math.cos(endAngle) * 100;
                const y2 = Math.sin(endAngle) * 100;
                
                const labelAngle = startAngle + angle / 2;
                const labelX = Math.cos(labelAngle) * 70;
                const labelY = Math.sin(labelAngle) * 70;
                
                const pathData = `M 0 0 L ${x1} ${y1} A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                
                const slice = `
                  <path class="slice-${i % 3}" d="${pathData}" />
                  ${d.value > 0 ? `<text class="label" x="${labelX}" y="${labelY}" text-anchor="middle">${d.name}: ${d.value}</text>` : ''}
                `;
                
                startAngle = endAngle;
                return slice;
              }).join('');
            })()}
          </g>
        </svg>
      `;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Analytics Report - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; margin: 0; padding: 0; color: #333; line-height: 1.6; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 30px 20px; margin-bottom: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { margin: 0; font-size: 28px; font-weight: 700; }
            h2 { font-size: 24px; margin-top: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            h3 { font-size: 20px; margin-top: 25px; color: #4f46e5; }
            .date { font-size: 16px; margin-top: 10px; opacity: 0.8; }
            .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
            .metrics { display: flex; flex-wrap: wrap; gap: 20px; margin: 30px 0; }
            .metric { flex: 1; min-width: 200px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
            .metric-value { font-size: 36px; font-weight: 700; color: #4f46e5; margin: 10px 0; }
            .metric-label { font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
            .chart-container { margin: 30px 0; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
            ul.recommendations { padding-left: 20px; }
            ul.recommendations li { margin-bottom: 10px; }
            footer { margin-top: 50px; text-align: center; font-size: 14px; color: #64748b; padding: 20px; border-top: 1px solid #e2e8f0; }
            .charts { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; }
            .chart { flex: 1; min-width: 300px; display: flex; flex-direction: column; align-items: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <header>
              <h1>Analytics Dashboard Report</h1>
              <div class="date">Generated on ${new Date().toLocaleString()}</div>
            </header>
            
            <div class="metrics">
              <div class="metric">
                <div class="metric-label">Total Processes</div>
                <div class="metric-value">${processes.length}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Total Sessions</div>
                <div class="metric-value">${sessions.length}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Completion Rate</div>
                <div class="metric-value">${getCompletionRate(sessions)}%</div>
              </div>
              <div class="metric">
                <div class="metric-label">Average Duration</div>
                <div class="metric-value">${getAverageDuration(sessions)} min</div>
              </div>
            </div>
            
            <h2>AI Analysis</h2>
            <div class="card">
              <h3>Analysis</h3>
              <p>${analysis}</p>
            </div>
            
            <div class="card">
              <h3>Recommendations</h3>
              <ul class="recommendations">
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
            
            <h2>Process Usage Data</h2>
            <div class="charts">
              <div class="chart">
                <h3>Process Usage Breakdown</h3>
                ${processChartSvg}
              </div>
              
              <div class="chart">
                <h3>Session Types Distribution</h3>
                ${pieChartSvg}
              </div>
            </div>
            
            <div class="chart-container">
              <h3>Process Details</h3>
              <ul>
                ${processes.map(p => {
                  const sessionCount = sessions.filter(s => s.processId === p.id).length;
                  return `<li><strong>${p.name}</strong>: ${sessionCount} sessions</li>`;
                }).join('')}
              </ul>
            </div>
            
            <div class="chart-container">
              <h3>Session Types Breakdown</h3>
              <ul>
                ${Object.entries(getSessionTypesBreakdown(sessions)).map(([key, value]) => 
                  `<li><strong>${key}</strong>: ${value} sessions</li>`
                ).join('')}
              </ul>
            </div>
            
            <footer>
              &copy; ${new Date().getFullYear()} Digital Processes Portal. All rights reserved.
            </footer>
          </div>
        </body>
        </html>
      `;
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(blob);
      downloadLink.download = `analytics-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600">Overview of all digital processes and their performance</p>
        </div>
        
        <div className="flex flex-col items-end gap-4">
          <Tabs defaultValue="analytics" className="w-auto">
            <TabsList>
              <TabsTrigger value="processes" asChild>
                <Link to={createPageUrl('Dashboard')}>Processes</Link>
              </TabsTrigger>
              <TabsTrigger value="analytics" asChild>
                <Link to={createPageUrl('Analytics')}>Analytics</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-4">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
            />
            
            <Button onClick={generateReport}>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold">A Word From Your AI Analyst</h2>
        </div>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
          <CardHeader>
            <CardTitle>Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{analysis}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 p-6">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-600 shrink-0">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Process Usage Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <PieChart width={400} height={250}>
              <Pie
                data={processes.map(p => ({
                  name: p.name,
                  value: sessions.filter(s => s.processId === p.id).length
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {processes.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 360 / processes.length}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <CardTitle>Session Types Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <PieChart width={400} height={250}>
              <Pie
                data={Object.entries(getSessionTypesBreakdown(sessions)).map(([key, value]) => ({
                  name: key,
                  value: value
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                <Cell fill="#4f46e5" />
                <Cell fill="#7c3aed" />
                <Cell fill="#2563eb" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </CardContent>
        </Card>

        <Card className="p-6 col-span-2">
          <CardHeader>
            <CardTitle>Process Usage Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <LineChart
              width={800}
              height={300}
              data={processes.map(p => ({
                name: p.name,
                sessions: sessions.filter(s => s.processId === p.id).length
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="sessions" stroke="#4f46e5" />
            </LineChart>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
