import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DashboardStats {
  totalGuests: number;
  confirmedCount: number;
  declinedCount: number;
  pendingCount: number;
  partialCount: number;
  byAccommodationGroup: { name: string; value: number }[];
  byInviteType: { name: string; value: number }[];
  rsvpTimeline: { date: string; count: number }[];
  dietaryRestrictions: { name: string; value: number }[];
}

const COLORS = ['#000000', '#333333', '#666666', '#999999', '#CCCCCC'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log("📊 Loading dashboard data...");

      // Fetch all guests
      console.log("Fetching guests...");
      const { data: guests, error: guestsError } = await supabase
        .from("guests")
        .select("*");

      if (guestsError) {
        console.error("❌ Guests error:", guestsError);
        throw guestsError;
      }
      console.log("✅ Guests loaded:", guests?.length);

      // Fetch all invites
      const { data: invites, error: invitesError } = await supabase
        .from("invites")
        .select("*");

      if (invitesError) throw invitesError;

      // Fetch RSVP responses
      const { data: rsvpResponses, error: rsvpError } = await supabase
        .from("rsvp_responses")
        .select("*");

      if (rsvpError) throw rsvpError;

      // Calculate statistics
      const totalGuests = guests?.length || 0;

      const rsvpStatusCounts = invites?.reduce((acc, invite) => {
        acc[invite.rsvp_status] = (acc[invite.rsvp_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // By accommodation group
      const accommodationGroupCounts = invites?.reduce((acc, invite) => {
        if (invite.accommodation_group) {
          acc[invite.accommodation_group] = (acc[invite.accommodation_group] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const byAccommodationGroup = Object.entries(accommodationGroupCounts).map(([name, value]) => ({
        name,
        value
      }));

      // By invite type
      const inviteTypeCounts = invites?.reduce((acc, invite) => {
        acc[invite.invite_type] = (acc[invite.invite_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const byInviteType = Object.entries(inviteTypeCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      // RSVP timeline
      const rsvpTimeline = invites
        ?.filter(invite => invite.rsvp_submitted_at)
        .sort((a, b) => new Date(a.rsvp_submitted_at!).getTime() - new Date(b.rsvp_submitted_at!).getTime())
        .reduce((acc, invite) => {
          const date = new Date(invite.rsvp_submitted_at!).toISOString().split('T')[0];
          const existing = acc.find(item => item.date === date);
          if (existing) {
            existing.count += 1;
          } else {
            acc.push({ date, count: 1 });
          }
          return acc;
        }, [] as { date: string; count: number }[]) || [];

      // Cumulative RSVP timeline
      let cumulative = 0;
      const cumulativeTimeline = rsvpTimeline.map(item => {
        cumulative += item.count;
        return { ...item, count: cumulative };
      });

      // Dietary restrictions
      const dietaryMap: Record<string, number> = {};
      rsvpResponses?.forEach(response => {
        if (response.dietary_restrictions && Array.isArray(response.dietary_restrictions)) {
          response.dietary_restrictions.forEach((restriction: string) => {
            if (restriction && restriction !== 'none') {
              dietaryMap[restriction] = (dietaryMap[restriction] || 0) + 1;
            }
          });
        }
      });

      const dietaryRestrictions = Object.entries(dietaryMap).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value
      }));

      setStats({
        totalGuests,
        confirmedCount: rsvpStatusCounts['confirmed'] || 0,
        declinedCount: rsvpStatusCounts['declined'] || 0,
        pendingCount: rsvpStatusCounts['pending'] || 0,
        partialCount: rsvpStatusCounts['partial'] || 0,
        byAccommodationGroup,
        byInviteType,
        rsvpTimeline: cumulativeTimeline,
        dietaryRestrictions
      });

      setError("");
    } catch (err: any) {
      console.error("Error loading dashboard:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <h1 className="admin-page-title">Dashboard</h1>
        <div className="admin-error-box">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Dashboard</h1>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Guests</div>
          <div className="stat-value">{stats.totalGuests}</div>
        </div>
        <div className="stat-card stat-confirmed">
          <div className="stat-label">Confirmed</div>
          <div className="stat-value">{stats.confirmedCount}</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats.pendingCount}</div>
        </div>
        <div className="stat-card stat-declined">
          <div className="stat-label">Declined</div>
          <div className="stat-value">{stats.declinedCount}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* RSVP Timeline */}
        <div className="chart-card">
          <h3 className="chart-title">RSVP Timeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.rsvpTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#000000" name="Total RSVPs" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Invite Types */}
        <div className="chart-card">
          <h3 className="chart-title">Invite Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.byInviteType}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.byInviteType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Accommodation Groups */}
        <div className="chart-card">
          <h3 className="chart-title">Accommodation Groups</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.byAccommodationGroup}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#000000" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dietary Restrictions */}
        <div className="chart-card">
          <h3 className="chart-title">Dietary Restrictions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.dietaryRestrictions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#333333" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        .admin-page {
          min-height: 100vh;
        }

        .admin-page-title {
          font-size: 2rem;
          font-weight: 400;
          margin: 0 0 2rem 0;
          color: #000000;
        }

        .admin-loading {
          display: flex;
          justify-content: center;
          padding: 4rem 0;
        }

        .admin-error-box {
          padding: 1rem;
          background-color: #ffebee;
          color: #c62828;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border-left: 4px solid #000000;
        }

        .stat-card.stat-confirmed {
          border-left-color: #2e7d32;
        }

        .stat-card.stat-pending {
          border-left-color: #f57c00;
        }

        .stat-card.stat-declined {
          border-left-color: #c62828;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #666666;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 600;
          color: #000000;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 2rem;
        }

        .chart-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .chart-title {
          font-size: 1.25rem;
          font-weight: 500;
          margin: 0 0 1rem 0;
          color: #000000;
        }

        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }

          .stat-value {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
