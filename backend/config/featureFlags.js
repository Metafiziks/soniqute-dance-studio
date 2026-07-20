// config/featureFlags.js
module.exports = {
  FEATURE_V4_DISCOVERY: process.env.FEATURE_V4_DISCOVERY === 'true',
  FEATURE_V4_REPLY_SWEEP: process.env.FEATURE_V4_REPLY_SWEEP === 'true',
  FEATURE_POST_TEXT_QUALITY: process.env.FEATURE_POST_TEXT_QUALITY === 'true',

  DAILY_POSTS_PER_USER: Number(process.env.DAILY_POSTS_PER_USER || '1'),
  DISCOVERY_PAGES_PER_DAY: Number(process.env.DISCOVERY_PAGES_PER_DAY || '3'),
  DISCOVERY_MAX_RESULTS: Number(process.env.DISCOVERY_MAX_RESULTS || '100'),
  BULK_REFRESH_IDS_PER_DAY: Number(process.env.BULK_REFRESH_IDS_PER_DAY || '80'),
  REPLY_SWEEP_BATCH_USERS: Number(process.env.REPLY_SWEEP_BATCH_USERS || '50'),
  REPLY_SWEEP_PAGES_PER_BATCH: Number(process.env.REPLY_SWEEP_PAGES_PER_BATCH || '2'),

  DAILY_PUMPS: Number(process.env.DAILY_PUMPS || '10'),
  DAILY_DUMPS: Number(process.env.DAILY_DUMPS || '5'),

  SELF_POST_MAX: Number(process.env.SELF_POST_MAX || '50'),
  SHARED_POST_MAX: Number(process.env.SHARED_POST_MAX || '75'),
  SELF_PUMP_CAP: Number(process.env.SELF_PUMP_CAP || '15'),
  SELF_DUMP_CAP: Number(process.env.SELF_DUMP_CAP || '15'),
  SHARED_PUMP_CAP: Number(process.env.SHARED_PUMP_CAP || '25'),
  SHARED_DUMP_CAP: Number(process.env.SHARED_DUMP_CAP || '25'),
  PER_MEME_GLOBAL_CAP: Number(process.env.PER_MEME_GLOBAL_CAP || '350'),

  DISCOVERY_QUERY:
    process.env.DISCOVERY_QUERY ||
    '(#GRIZL AND $GRFTY) (has:images OR has:media) -is:retweet -is:quote',

  REPLY_HASHTAGS: (process.env.REPLY_HASHTAGS || '#pump,#dump,#GRIZL,$GRFTY,#GZ')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
