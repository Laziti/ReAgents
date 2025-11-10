import React from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Users, DollarSign, Clock, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

const pieColors = [
  'var(--portal-accent)', // Red
  '#ff6b6b', // Light red
  '#cc0000', // Dark red
  '#ff9999', // Very light red
];

const AdminDashboard = () => {
  const [userGrowthData, setUserGrowthData] = useState<{ month: string; users: number }[]>([]);
  const [proNonProData, setProNonProData] = useState([
    { name: 'Pro Users', value: 0 },
    { name: 'Non-Pro Users', value: 0 },
  ]);
  const [statCards, setStatCards] = useState([
    { title: 'New Users This Month', value: 0, icon: <Users className="h-6 w-6 text-[var(--portal-accent)]" /> },
    { title: 'Pending Payments', value: 0, icon: <Clock className="h-6 w-6 text-[var(--portal-accent)]" /> },
    { title: 'Revenue', value: '$0', icon: <DollarSign className="h-6 w-6 text-[var(--portal-accent)]" /> },
  ]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      // User Growth (last 6 months)
      const now = new Date();
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return d.toLocaleString('default', { month: 'short', year: '2-digit' });
      });
      const userCounts: { [key: string]: number } = {};
      for (const month of months) userCounts[month] = 0;
      const { data: profiles } = await supabase.from('profiles').select('created_at');
      if (profiles) {
        profiles.forEach((p: any) => {
          const d = new Date(p.created_at);
          const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
          if (userCounts[key] !== undefined) userCounts[key]++;
        });
      }
      setUserGrowthData(months.map(month => ({ month, users: userCounts[month] })));

      // Pro/Non-Pro Users
      const [{ count: proCount }, { count: freeCount }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'pro'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'free'),
      ]);
      setProNonProData([
        { name: 'Pro Users', value: proCount || 0 },
        { name: 'Non-Pro Users', value: freeCount || 0 },
      ]);

      // New Users This Month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: newUsersThisMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth);
      // Revenue and Pending Payments
      const { data: subscriptionRequests } = await supabase
        .from('subscription_requests')
        .select('amount, status');
      let revenue = 0;
      let pendingPayments = 0;
      if (subscriptionRequests) {
        for (const req of subscriptionRequests) {
          if (req.status === 'approved') revenue += req.amount;
          if (req.status === 'pending') pendingPayments++;
        }
      }
      setStatCards(cards => cards.map(card => {
        if (card.title === 'New Users This Month') return { ...card, value: newUsersThisMonth || 0 };
        if (card.title === 'Pending Payments') return { ...card, value: pendingPayments };
        if (card.title === 'Revenue') return { ...card, value: `$${revenue.toLocaleString()}` };
        return card;
      }));
    };
    fetchAnalytics();
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full md:pl-72 bg-gradient-to-br from-gray-50 to-white">
        <div className="flex h-screen w-full">
          <AdminSidebar />
          <SidebarInset>
            <div className="bg-gradient-to-br from-gray-50 to-white min-h-screen flex flex-col">
              <div className="flex items-center border-b border-[var(--portal-border)] bg-white/80 backdrop-blur-sm p-6 shadow-sm">
                <SidebarTrigger />
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-[var(--portal-text)]">Analytics Dashboard</h1>
                  <p className="text-sm text-[var(--portal-text-secondary)] mt-1">Overview of your platform metrics</p>
                </div>
              </div>
              <div className="p-6 flex flex-col gap-8 overflow-auto flex-1">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
                  {statCards.map((card, index) => (
                    <Card key={card.title} className="bg-white border-[var(--portal-border)] shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--portal-accent)]/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <CardContent className="p-6 flex flex-row items-center">
                        <div className="mr-4 p-3 rounded-xl bg-gradient-to-br from-[var(--portal-accent)]/10 to-[var(--portal-accent)]/5 group-hover:from-[var(--portal-accent)]/20 group-hover:to-[var(--portal-accent)]/10 transition-all duration-300">
                          {card.icon}
                        </div>
                        <div className="flex flex-col items-start flex-1">
                          <span className="text-3xl font-bold text-[var(--portal-text)] mb-1">{card.value}</span>
                          <span className="text-sm text-[var(--portal-text-secondary)] font-medium">{card.title}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl">
                  {/* User Growth Line Chart */}
                  <Card className="bg-white border-[var(--portal-border)] shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--portal-accent)]/10 to-[var(--portal-accent)]/5">
                          <BarChart3 className="h-5 w-5 text-[var(--portal-accent)]" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-[var(--portal-text)]">User Growth (6 months)</CardTitle>
                          <CardDescription className="text-[var(--portal-text-secondary)] text-xs mt-1">User registrations over time</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={userGrowthData} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
                            <XAxis dataKey="month" stroke="var(--portal-text-secondary)" tick={{ fill: 'var(--portal-text-secondary)', fontSize: 12 }} />
                            <YAxis stroke="var(--portal-text-secondary)" tick={{ fill: 'var(--portal-text-secondary)', fontSize: 12 }} />
                            <Tooltip 
                              contentStyle={{ 
                                background: '#fff', 
                                border: '1px solid var(--portal-border)', 
                                color: 'var(--portal-text)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                              }} 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="users" 
                              stroke="var(--portal-accent)" 
                              strokeWidth={3} 
                              dot={{ r: 6, fill: 'var(--portal-accent)' }}
                              activeDot={{ r: 8, fill: 'var(--portal-accent)' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  {/* Pro vs Non-Pro Users Pie Chart */}
                  <Card className="bg-white border-[var(--portal-border)] shadow-lg hover:shadow-xl transition-all duration-300">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--portal-accent)]/10 to-[var(--portal-accent)]/5">
                          <BarChart3 className="h-5 w-5 text-[var(--portal-accent)]" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-[var(--portal-text)]">Pro vs Non-Pro Users</CardTitle>
                          <CardDescription className="text-[var(--portal-text-secondary)] text-xs mt-1">Distribution of user subscriptions</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={proNonProData}
                              dataKey="value"
                              nameKey="name"
                              cx="40%"
                              cy="50%"
                              outerRadius={80}
                              label={{ fill: 'var(--portal-text)', fontSize: 12, fontWeight: 500 }}
                            >
                              {proNonProData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                              ))}
                            </Pie>
                            <Legend 
                              align="left" 
                              verticalAlign="bottom" 
                              iconType="circle"
                              wrapperStyle={{ fontSize: '12px', color: 'var(--portal-text)' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                background: '#fff', 
                                border: '1px solid var(--portal-border)', 
                                color: 'var(--portal-text)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                              }} 
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
