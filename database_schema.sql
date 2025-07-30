-- AlkaForge Subscription System Database Schema
-- Run this script in your Supabase SQL editor to set up the subscription tables

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL DEFAULT 'FREE' CHECK (subscription_tier IN ('FREE', 'STANDARD', 'PREMIUM')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  monthly_usage INTEGER NOT NULL DEFAULT 0,
  usage_reset_date TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create usage_monitoring table for tracking premium users exceeding soft caps
CREATE TABLE IF NOT EXISTS usage_monitoring (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_count INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to increment user usage
CREATE OR REPLACE FUNCTION increment_user_usage(user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, monthly_usage)
  VALUES (user_id, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    monthly_usage = user_subscriptions.monthly_usage + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to reset monthly usage (for cron job)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID AS $$
BEGIN
  UPDATE user_subscriptions 
  SET 
    monthly_usage = 0,
    usage_reset_date = date_trunc('month', NOW()) + INTERVAL '1 month',
    updated_at = NOW()
  WHERE usage_reset_date <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_usage_reset_date ON user_subscriptions(usage_reset_date);
CREATE INDEX IF NOT EXISTS idx_usage_monitoring_user_id ON usage_monitoring(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_monitoring_created_at ON usage_monitoring(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_monitoring ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_subscriptions
CREATE POLICY "Users can view their own subscription" ON user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for usage_monitoring (read-only for users)
CREATE POLICY "Users can view their own usage monitoring" ON usage_monitoring
  FOR SELECT USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_subscriptions TO anon, authenticated;
GRANT ALL ON usage_monitoring TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_user_usage(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_usage() TO postgres;

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for subscription analytics (admin use)
CREATE OR REPLACE VIEW subscription_analytics AS
SELECT 
  subscription_tier,
  COUNT(*) as user_count,
  AVG(monthly_usage) as avg_monthly_usage,
  SUM(monthly_usage) as total_monthly_usage,
  COUNT(CASE WHEN stripe_subscription_id IS NOT NULL THEN 1 END) as paying_customers
FROM user_subscriptions
GROUP BY subscription_tier;

-- Grant access to the analytics view for authenticated users
GRANT SELECT ON subscription_analytics TO authenticated;

-- Create API keys table for developer access (Premium tier only)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE, -- Store hash of the API key for security
  api_key_prefix TEXT NOT NULL, -- Store first 8 chars for identification (ak_12345678...)
  monthly_usage INTEGER NOT NULL DEFAULT 0,
  usage_reset_date TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key_name)
);

-- Function to increment API key usage
CREATE OR REPLACE FUNCTION increment_api_key_usage(target_api_key_hash TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys 
  SET 
    monthly_usage = monthly_usage + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE api_key_hash = target_api_key_hash AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset API key monthly usage
CREATE OR REPLACE FUNCTION reset_api_key_usage()
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys 
  SET 
    monthly_usage = 0,
    usage_reset_date = date_trunc('month', NOW()) + INTERVAL '1 month',
    updated_at = NOW()
  WHERE usage_reset_date <= NOW() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- Enable RLS on api_keys
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for api_keys
CREATE POLICY "Users can manage their own API keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);

-- Grant permissions for API keys
GRANT ALL ON api_keys TO authenticated;
GRANT EXECUTE ON FUNCTION increment_api_key_usage(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reset_api_key_usage() TO postgres; 