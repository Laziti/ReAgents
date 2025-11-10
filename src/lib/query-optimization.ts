/**
 * Database query optimization utilities
 * Prevents N+1 queries and optimizes data fetching
 */

/**
 * Batch fetch user profiles
 */
export async function batchFetchProfiles(
  supabase: any,
  userIds: string[]
): Promise<Map<string, any>> {
  if (userIds.length === 0) {
    return new Map();
  }

  // Batch fetch all profiles at once
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  if (error) {
    throw error;
  }

  // Create a map for O(1) lookup
  const profilesMap = new Map<string, any>();
  (data || []).forEach((profile: any) => {
    profilesMap.set(profile.id, profile);
  });

  return profilesMap;
}

/**
 * Batch fetch listing counts
 */
export async function batchFetchListingCounts(
  supabase: any,
  userIds: string[]
): Promise<Map<string, number>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('listings')
    .select('user_id')
    .in('user_id', userIds);

  if (error) {
    throw error;
  }

  // Count listings per user
  const countsMap = new Map<string, number>();
  (data || []).forEach((listing: any) => {
    const current = countsMap.get(listing.user_id) || 0;
    countsMap.set(listing.user_id, current + 1);
  });

  return countsMap;
}

/**
 * Optimized fetch with joins (when possible)
 */
export async function fetchListingsWithUsers(
  supabase: any,
  filters: {
    userId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ listings: any[]; users: Map<string, any> }> {
  let query = supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data: listings, error } = await query;

  if (error) {
    throw error;
  }

  // Batch fetch all unique user IDs
  const userIds = [...new Set((listings || []).map((l: any) => l.user_id).filter(Boolean))];
  const users = await batchFetchProfiles(supabase, userIds);

  return {
    listings: listings || [],
    users,
  };
}

