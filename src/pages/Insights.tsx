/**
 * Insights Page
 * Usage trends, risk history, and progress over time
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useInsightsData } from '@/hooks/useInsightsData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, TrendingUp, TrendingDown, Minus, 
  Calendar, Activity, Bell, Clock, RefreshCw 
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { cn } from '@/lib/utils';

export default function Insights() {
  const navigate = useNavigate();
  const { userId, loading: roleLoading } = useUserRole();
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const { data, loading, refetch } = useInsightsData(userId, period);

  if (roleLoading || !userId) {
    return (
      <div className="min-h-screen bg-background p-4 pt-safe">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const getTrendIcon = () => {
    if (!data) return <Minus className="h-5 w-5" />;
    switch (data.summary.trendDirection) {
      case 'improving':
        return <TrendingDown className="h-5 w-5 text-green-500" />;
      case 'worsening':
        return <TrendingUp className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTrendLabel = () => {
    if (!data) return 'No data';
    switch (data.summary.trendDirection) {
      case 'improving':
        return 'Improving';
      case 'worsening':
        return 'Needs attention';
      default:
        return 'Stable';
    }
  };

  const getTrendColor = () => {
    if (!data) return 'text-muted-foreground';
    switch (data.summary.trendDirection) {
      case 'improving':
        return 'text-green-500';
      case 'worsening':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  // Prepare radar chart data
  const latestFactors = data?.factorTrends.slice(-1)[0];
  const radarData = latestFactors ? [
    { factor: 'Session', value: latestFactors.sessionDuration, fullMark: 50 },
    { factor: 'Reopens', value: latestFactors.reopenFrequency, fullMark: 50 },
    { factor: 'Scroll', value: latestFactors.scrollVelocity, fullMark: 50 },
    { factor: 'Late Night', value: latestFactors.lateNight, fullMark: 50 },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 pt-safe pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Insights</h1>
              <p className="text-xs text-muted-foreground">Your progress over time</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={refetch} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {([7, 14, 30] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p}d
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Activity className="h-4 w-4" />
                Avg Risk Score
              </div>
              <div className="text-3xl font-bold">
                {data?.summary.avgRiskScore ?? '-'}
              </div>
              <div className={cn('flex items-center gap-1 text-sm mt-1', getTrendColor())}>
                {getTrendIcon()}
                {getTrendLabel()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Clock className="h-4 w-4" />
                Sessions
              </div>
              <div className="text-3xl font-bold">
                {data?.summary.totalSessions ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Last {period} days
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Bell className="h-4 w-4" />
                Interventions
              </div>
              <div className="text-3xl font-bold">
                {data?.summary.totalInterventions ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Last {period} days
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="h-4 w-4" />
                Top Trigger
              </div>
              <div className="text-lg font-bold capitalize">
                {data?.summary.mostCommonTrigger?.replace('_', ' ') ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Most frequent
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="risk" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="risk">Risk Trend</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="factors">Factors</TabsTrigger>
          </TabsList>

          {/* Risk Score Trend */}
          <TabsContent value="risk">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Score Over Time</CardTitle>
                <CardDescription>
                  Track how your risk level changes throughout the day
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : data?.riskHistory && data.riskHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={data.riskHistory}>
                      <defs>
                        <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: 'numeric' })}
                        className="text-xs"
                      />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        fill="url(#riskGradient)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No risk history data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Daily Activity */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Activity</CardTitle>
                <CardDescription>
                  Sessions and interventions per day
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : data?.dailyStats && data.dailyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(d) => new Date(d).toLocaleDateString([], { weekday: 'short' })}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        labelFormatter={(d) => new Date(d).toLocaleDateString()}
                      />
                      <Legend />
                      <Bar 
                        dataKey="sessions" 
                        name="Sessions"
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]} 
                      />
                      <Bar 
                        dataKey="interventions" 
                        name="Interventions"
                        fill="hsl(var(--destructive))" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No activity data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Avg Risk per Day */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Average Risk by Day</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : data?.dailyStats ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(d) => new Date(d).toLocaleDateString([], { weekday: 'short' })}
                        className="text-xs"
                      />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgRiskScore"
                        name="Avg Risk"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No data
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Factor Breakdown */}
          <TabsContent value="factors">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Factor Breakdown</CardTitle>
                <CardDescription>
                  What's contributing to your risk score
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData}>
                      <PolarGrid className="stroke-muted" />
                      <PolarAngleAxis dataKey="factor" className="text-xs" />
                      <PolarRadiusAxis angle={30} domain={[0, 50]} className="text-xs" />
                      <Radar
                        name="Current"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No factor data yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Factor Trends Over Time */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">Factor Trends</CardTitle>
                <CardDescription>
                  How each factor changes over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : data?.factorTrends && data.factorTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.factorTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="sessionDuration" name="Session" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="reopenFrequency" name="Reopens" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="scrollVelocity" name="Scroll" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="lateNight" name="Late Night" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    No factor history yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Tips Section */}
        {data && data.summary.trendDirection !== 'improving' && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-2">💡 Tip</h3>
              <p className="text-sm text-muted-foreground">
                {data.summary.mostCommonTrigger === 'scroll' && 
                  "Try slowing down your scrolling. Mindful browsing can help reduce compulsive patterns."}
                {data.summary.mostCommonTrigger === 'reopen' && 
                  "You're reopening the app frequently. Try setting specific times to check instead."}
                {data.summary.mostCommonTrigger === 'late_night' && 
                  "Late night usage is affecting your score. Consider setting a digital bedtime."}
                {data.summary.mostCommonTrigger === 'session_start' && 
                  "Long sessions are your main trigger. Try taking breaks every 20 minutes."}
                {!['scroll', 'reopen', 'late_night', 'session_start'].includes(data.summary.mostCommonTrigger) &&
                  "Keep tracking your usage to identify patterns and build healthier habits."}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
