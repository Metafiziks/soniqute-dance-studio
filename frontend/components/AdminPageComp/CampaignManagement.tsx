import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { userRequest } from '../../services/RequestMethods';
import toast from 'react-hot-toast';

interface Campaign {
  _id: string;
  name: string;
  description?: string;
  active: boolean;
  hashtags: string[];
  mediaCount?: number;
  createdAt: string;
}

const CampaignManagement = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states for horizontal input
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hashtag1: '',
    hashtag2: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const response = await userRequest.get('/campaigns');
      setCampaigns(response.data);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Add campaign
  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    setSubmitting(true);
    
    try {
      const hashtags = [formData.hashtag1, formData.hashtag2]
        .filter(tag => tag.trim())
        .map(tag => tag.trim().startsWith('#') || tag.trim().startsWith('$') ? tag.trim() : `#${tag.trim()}`);

      const campaignData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        hashtags,
        active: true // Auto-activate when created
      };

      const response = await userRequest.post('/campaigns', campaignData);
      
      if (response.data) {
        toast.success('Campaign created successfully!');
        setCampaigns(prev => [response.data, ...prev]);
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          hashtag1: '',
          hashtag2: ''
        });
      }
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle campaign status
  const toggleCampaignStatus = async (campaign: Campaign) => {
    try {
      const response = await userRequest.patch(`/campaigns/${campaign._id}`, {
        active: !campaign.active
      });
      
      if (response.data) {
        toast.success(`Campaign ${campaign.active ? 'deactivated' : 'activated'} successfully`);
        setCampaigns(prev => 
          prev.map(c => c._id === campaign._id ? { ...c, active: !c.active } : c)
        );
      }
    } catch (error) {
      console.error('Failed to update campaign:', error);
      toast.error('Failed to update campaign status');
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      await userRequest.delete(`/campaigns/${campaignId}`);
      toast.success('Campaign deleted successfully');
      setCampaigns(prev => prev.filter(c => c._id !== campaignId));
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3 text-white/60">Loading campaigns...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-white mb-2">Campaign Management</h2>
        <p className="text-white/60 text-sm">Create campaigns and track hashtags for media uploads</p>
      </div>

      {/* Horizontal Add Campaign Form */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Create New Campaign</h3>
        
        <form onSubmit={handleAddCampaign} className="space-y-4">
          {/* Row 1: Name and Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Campaign Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer 2024 Launch"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                required
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief campaign description"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
                rows={2}
              />
            </div>
          </div>

          {/* Row 2: Hashtags and Submit */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-white/80 text-sm mb-2">Hashtag/Cashtag 1</label>
              <input
                type="text"
                value={formData.hashtag1}
                onChange={(e) => setFormData({ ...formData, hashtag1: e.target.value })}
                placeholder="e.g., $SONIQ or #PAMS"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <label className="block text-white/80 text-sm mb-2">Hashtag/Cashtag 2</label>
              <input
                type="text"
                value={formData.hashtag2}
                onChange={(e) => setFormData({ ...formData, hashtag2: e.target.value })}
                placeholder="e.g., #Vibes or #Launch"
                className="w-full bg-white/5 border border-white/10 text-white placeholder-white/40 rounded-xl px-4 py-3 focus:outline-none focus:border-white/20"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={submitting || !formData.name.trim()}
                className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 text-sm font-semibold text-white shadow-[0_0_26px_rgba(244,114,182,.8)] hover:brightness-110 disabled:opacity-70 transition"
              >
                {submitting ? 'Creating...' : 'Add Campaign'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Campaigns Table */}
      <div className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Active Campaigns ({campaigns.filter(c => c.active).length})
        </h3>

        {campaigns.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            No campaigns yet. Create your first campaign above!
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <motion.div
                key={campaign._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold">{campaign.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        campaign.active 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/20'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-400/20'
                      }`}>
                        {campaign.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-400 border border-violet-400/20">
                        {campaign.mediaCount || 0} media
                      </span>
                    </div>
                    
                    {campaign.description && (
                      <p className="text-white/60 text-sm mb-2">{campaign.description}</p>
                    )}
                    
                    {campaign.hashtags.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white/40 text-xs">Tags:</span>
                        {campaign.hashtags.map((tag, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-pink-300 border border-pink-400/20">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs text-white/40">
                      Created: {formatDate(campaign.createdAt)}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCampaignStatus(campaign)}
                      className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition"
                      title={campaign.active ? 'Deactivate' : 'Activate'}
                    >
                      {campaign.active ? (
                        // X icon for deactivate
                        <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        // Check icon for activate  
                        <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteCampaign(campaign._id)}
                      className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition"
                      title="Delete"
                    >
                      <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignManagement;