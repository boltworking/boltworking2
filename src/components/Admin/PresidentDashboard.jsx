import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Users,
  Calendar,
  Megaphone,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  UserPlus,
  FileText,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';

export function PresidentDashboard() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    statistics: {},
    recentClubs: [],
    recentElections: []
  });
  
  // States for different sections
  const [clubs, setClubs] = useState([]);
  const [elections, setElections] = useState([]);
  const [news, setNews] = useState([]);
  const [complaints, setComplaints] = useState([]);
  
  // Form states
  const [showClubForm, setShowClubForm] = useState(false);
  const [showElectionForm, setShowElectionForm] = useState(false);
  const [showNewsForm, setShowNewsForm] = useState(false);

  useEffect(() => {
    if (user?.role === 'president_admin') {
      fetchDashboardData();
    }
  }, [user, token]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/president-admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClubs = async () => {
    try {
      const response = await fetch('/api/president-admin/clubs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setClubs(data.data);
    } catch (error) {
      toast.error('Failed to load clubs');
    }
  };

  const fetchElections = async () => {
    try {
      const response = await fetch('/api/president-admin/elections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setElections(data.data);
    } catch (error) {
      toast.error('Failed to load elections');
    }
  };

  const fetchNews = async () => {
    try {
      const response = await fetch('/api/news', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setNews(data.data);
    } catch (error) {
      toast.error('Failed to load news');
    }
  };

  const fetchComplaints = async () => {
    try {
      const response = await fetch('/api/complaints/type/general', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setComplaints(data.data);
    } catch (error) {
      toast.error('Failed to load complaints');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'clubs':
        fetchClubs();
        break;
      case 'elections':
        fetchElections();
        break;
      case 'news':
        fetchNews();
        break;
      case 'complaints':
        fetchComplaints();
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading President Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-gray-900">President Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage student council infrastructure and operations</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { key: 'clubs', label: 'Clubs', icon: Users },
              { key: 'elections', label: 'Elections', icon: Calendar },
              { key: 'news', label: 'News', icon: Megaphone },
              { key: 'complaints', label: 'Complaints', icon: AlertCircle }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <DashboardOverview data={dashboardData} />
        )}

        {/* Clubs Tab */}
        {activeTab === 'clubs' && (
          <ClubsManagement 
            clubs={clubs} 
            onCreateClub={() => setShowClubForm(true)}
            onRefresh={fetchClubs}
          />
        )}

        {/* Elections Tab */}
        {activeTab === 'elections' && (
          <ElectionsManagement 
            elections={elections}
            onCreateElection={() => setShowElectionForm(true)}
            onRefresh={fetchElections}
          />
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <NewsManagement 
            news={news}
            onCreateNews={() => setShowNewsForm(true)}
            onRefresh={fetchNews}
          />
        )}

        {/* Complaints Tab */}
        {activeTab === 'complaints' && (
          <ComplaintsManagement 
            complaints={complaints}
            onRefresh={fetchComplaints}
          />
        )}
      </div>

      {/* Forms/Modals */}
      {showClubForm && (
        <ClubCreateForm 
          onClose={() => setShowClubForm(false)}
          onSuccess={() => {
            fetchClubs();
            fetchDashboardData();
          }}
        />
      )}

      {showElectionForm && (
        <ElectionCreateForm 
          onClose={() => setShowElectionForm(false)}
          onSuccess={() => {
            fetchElections();
            fetchDashboardData();
          }}
        />
      )}

      {showNewsForm && (
        <NewsCreateForm 
          onClose={() => setShowNewsForm(false)}
          onSuccess={() => {
            fetchNews();
          }}
        />
      )}
    </div>
  );
}

// Dashboard Overview Component
function DashboardOverview({ data }) {
  return (
    <div className="space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clubs"
          value={data.statistics.totalClubs || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Elections"
          value={data.statistics.activeElections || 0}
          icon={Calendar}
          color="green"
        />
        <StatCard
          title="Upcoming Elections"
          value={data.statistics.upcomingElections || 0}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Total Elections"
          value={data.statistics.totalElections || 0}
          icon={BarChart3}
          color="purple"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentClubs clubs={data.recentClubs || []} />
        <RecentElections elections={data.recentElections || []} />
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    orange: 'text-orange-600 bg-orange-100',
    purple: 'text-purple-600 bg-purple-100'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow p-6"
    >
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Recent Clubs Component
function RecentClubs({ clubs }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-medium">Recent Clubs</h3>
      </div>
      <div className="p-6">
        {clubs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent clubs</p>
        ) : (
          <div className="space-y-4">
            {clubs.map((club) => (
              <div key={club._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{club.name}</p>
                  <p className="text-sm text-gray-600">{club.category}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    club.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {club.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Recent Elections Component  
function RecentElections({ elections }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-medium">Recent Elections</h3>
      </div>
      <div className="p-6">
        {elections.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No recent elections</p>
        ) : (
          <div className="space-y-4">
            {elections.map((election) => (
              <div key={election._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{election.title}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(election.startDate).toLocaleDateString()} - {new Date(election.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    election.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : election.status === 'upcoming'
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {election.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Clubs Management Component
function ClubsManagement({ clubs, onCreateClub, onRefresh }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Clubs Management</h2>
        <button
          onClick={onCreateClub}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Club
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {clubs.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No clubs created yet</p>
            <button
              onClick={onCreateClub}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Club
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Club Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clubs.map((club) => (
                  <tr key={club._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{club.name}</div>
                        <div className="text-sm text-gray-500">{club.description?.substring(0, 60)}...</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{club.category}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        club.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {club.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {club.clubAdmin ? club.clubAdmin.name : 'Not assigned'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(club.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Elections Management Component
function ElectionsManagement({ elections, onCreateElection, onRefresh }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Elections Management</h2>
        <button
          onClick={onCreateElection}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Election
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {elections.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No elections created yet</p>
            <button
              onClick={onCreateElection}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Election
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Election Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {elections.map((election) => (
                  <tr key={election._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{election.title}</div>
                        <div className="text-sm text-gray-500">{election.electionType}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        election.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : election.status === 'upcoming'
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {election.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(election.startDate).toLocaleDateString()} - {new Date(election.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {election.totalVotes || 0} / {election.eligibleVoters || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-900">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// News Management Component  
function NewsManagement({ news, onCreateNews, onRefresh }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">News Management</h2>
        <button
          onClick={onCreateNews}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Post News
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {news.length === 0 ? (
          <div className="p-12 text-center">
            <Megaphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No news posts yet</p>
            <button
              onClick={onCreateNews}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Post
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {news.map((post) => (
              <div key={post._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{post.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{post.content?.substring(0, 150)}...</p>
                    <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                      <span>Category: {post.category}</span>
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      {post.readBy && <span>{post.readBy.length} reads</span>}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Complaints Management Component
function ComplaintsManagement({ complaints, onRefresh }) {
  const { token } = useAuth();

  const handleResolveComplaint = async (complaintId, resolutionNotes) => {
    try {
      const response = await fetch(`/api/complaints/${complaintId}/resolve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resolutionNotes })
      });

      if (response.ok) {
        toast.success('Complaint resolved successfully');
        onRefresh();
      } else {
        throw new Error('Failed to resolve complaint');
      }
    } catch (error) {
      toast.error('Failed to resolve complaint');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">General Complaints</h2>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {complaints.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No general complaints to resolve</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {complaints.map((complaint) => (
              <div key={complaint._id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-medium text-gray-900">{complaint.title}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        complaint.status === 'resolved' 
                          ? 'bg-green-100 text-green-800'
                          : complaint.status === 'under_review'
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {complaint.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{complaint.description}</p>
                    <div className="flex items-center mt-3 space-x-4 text-sm text-gray-500">
                      <span>Priority: {complaint.priority}</span>
                      <span>Category: {complaint.category}</span>
                      <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                    </div>
                    {complaint.documents && complaint.documents.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          <FileText className="w-4 h-4 inline mr-1" />
                          {complaint.documents.length} document(s) attached
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    {complaint.status !== 'resolved' && (
                      <button
                        onClick={() => {
                          const notes = prompt('Enter resolution notes:');
                          if (notes) handleResolveComplaint(complaint._id, notes);
                        }}
                        className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Resolve
                      </button>
                    )}
                    <button className="text-blue-600 hover:text-blue-900">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Placeholder form components - These would be implemented as full forms
function ClubCreateForm({ onClose, onSuccess }) {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Academic',
    contactEmail: '',
    meetingSchedule: '',
    requirements: '',
    clubManagerName: '',
    clubManagerUsername: '',
    clubManagerPassword: '',
    clubManagerEmail: '',
    clubManagerPhone: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/president-admin/clubs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Club created successfully!');
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to create club');
      }
    } catch (error) {
      toast.error('Failed to create club');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Create New Club</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Club Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {['Academic', 'Sports', 'Cultural', 'Technology', 'Service', 'Arts', 'Religious', 'Professional'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description *</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Club Manager (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Manager Name</label>
                <input
                  type="text"
                  value={formData.clubManagerName}
                  onChange={(e) => setFormData({...formData, clubManagerName: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manager Username</label>
                <input
                  type="text"
                  value={formData.clubManagerUsername}
                  onChange={(e) => setFormData({...formData, clubManagerUsername: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manager Email</label>
                <input
                  type="email"
                  value={formData.clubManagerEmail}
                  onChange={(e) => setFormData({...formData, clubManagerEmail: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Manager Password</label>
                <input
                  type="password"
                  value={formData.clubManagerPassword}
                  onChange={(e) => setFormData({...formData, clubManagerPassword: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Club
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Placeholder components for other forms
function ElectionCreateForm({ onClose, onSuccess }) {
  // Implementation would go here
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Create New Election</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-600">Election creation form would go here...</p>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Election
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewsCreateForm({ onClose, onSuccess }) {
  // Implementation would go here
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-medium">Create News Post</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-600">News creation form would go here...</p>
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Post News
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}