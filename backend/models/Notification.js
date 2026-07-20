const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // Core fields
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    type: {
        type: String,
        enum: ['grizl_blessing', 'daily_blessing', 'achievement', 'leaderboard', 'community', 'system']
    },

    title: {
        type: String,
        maxLength: 100,
        trim: true
    },

    message: {
        type: String,
        maxLength: 500,
        trim: true
    },

    // GRFTY-specific
    pointsAwarded: {
        type: Number,
        default: 0,
        min: 0
    },

    // Visual elements
    icon: {
        type: String,

    },

    // Optional metadata for extensibility
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Auto-expire field for cleanup
    expiresAt: {
        type: Date,
        default: function () {
            // Auto-expire after 30 days
            return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        },
        index: { expireAfterSeconds: 0 }
    }
}, {
    timestamps: true
});

// Compound indexes for performance
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ createdAt: -1 }); // For cleanup queries

// Static methods
notificationSchema.statics.getNotificationsByType = function (userId, type, limit = 10) {
    return this.find({ userId, type })
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Pre-save middleware to set icon based on type
notificationSchema.pre('save', function (next) {
    if (this.isNew && !this.icon) {
        const iconMap = {
            'grizl_blessing': 'fire',
            'daily_blessing': 'star',
            'achievement': 'trophy',
            'leaderboard': 'trending-up',
            'community': 'users',
            'system': 'bell'
        };
        this.icon = iconMap[this.type] || 'bell';
    }
    next();
});

module.exports = mongoose.model('Notification', notificationSchema); 