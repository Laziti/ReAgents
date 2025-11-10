import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Database } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';

type SignUpParams = {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  career?: string;
  receiptFile?: File;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userRole: 'super_admin' | 'agent' | null;
  userStatus: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'agent' | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // If session exists, fetch user role and status
        if (session?.user) {
          fetchUserRole(session.user.id);
          fetchUserStatus(session.user.id);
        } else {
          setUserRole(null);
          setUserStatus(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // If session exists, fetch user role and status
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchUserStatus(session.user.id);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user role from the database with retry logic
  const fetchUserRole = async (userId: string) => {
    const maxRetries = 3;
    let retryCount = 0;
    let roleAssigned = false;

    while (!roleAssigned && retryCount < maxRetries) {
      try {
        // First, check if role exists
        const { data: existingRole, error: checkError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (checkError) {
          logger.error(`Error checking user role (attempt ${retryCount + 1}):`, checkError);
        } else if (existingRole) {
          // Role exists, set it
          setUserRole(existingRole.role === 'super_admin' ? 'super_admin' : 'agent');
          roleAssigned = true;
          logger.log('User role found:', existingRole.role);
        } else {
          // No role found, create one
          logger.log('No role found, creating default agent role');
          const { error: createError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              role: 'agent'
            });

          if (createError) {
            logger.error(`Error creating user role (attempt ${retryCount + 1}):`, createError);
          } else {
            setUserRole('agent');
            roleAssigned = true;
            logger.log('Default agent role created successfully');
          }
        }
      } catch (error) {
        logger.error(`Error in fetchUserRole (attempt ${retryCount + 1}):`, error);
      }

      if (!roleAssigned) {
        retryCount++;
        if (retryCount < maxRetries) {
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
    }

    if (!roleAssigned) {
      logger.warn('Failed to fetch/create user role after all retries, defaulting to agent');
      setUserRole('agent');
    }
  };

  // Fetch user status from the database
  const fetchUserStatus = async (userId: string) => {
    try {
      // Check if profile exists using the correct field
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        logger.error('Error fetching user profile:', profileError);
        setUserStatus(null);
        return;
      }

      if (profile) {
        setUserStatus(profile.status);
      } else {
        // If no profile exists, don't create one automatically
        // Profiles should be created by the database trigger during signup
        logger.log('No profile found for user:', userId);
        setUserStatus(null);
      }
    } catch (error) {
      logger.error('Error in fetchUserStatus:', error);
      setUserStatus(null);
    }
  };


  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (error) {
        logger.error('Sign in error:', error);
        return { error };
      }

      if (!data.session) {
        return { error: new Error('No session created') };
      }

      // Set session and user
      setSession(data.session);
      setUser(data.session.user);

      // Fetch role and status
      await fetchUserRole(data.session.user.id);
      await fetchUserStatus(data.session.user.id);

      return { error: null };
    } catch (error) {
      logger.error('Error in signIn:', error);
      return { error };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      return { error };
    } catch (error) {
      logger.error('Error in signUp:', error);
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      logger.error('Error in signOut:', error);
    }
  };

  // Completely rewritten refreshSession method
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('Error refreshing token:', error);
        return;
      }
      
      // Update the session and user state with new data
      const newSession = data.session;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      // Update user role and status
      if (newSession?.user) {
        fetchUserRole(newSession.user.id);
        fetchUserStatus(newSession.user.id);
      }
    } catch (error) {
      logger.error('Error refreshing session:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userRole, 
      userStatus,
      loading, 
      signIn, 
      signUp, 
      signOut,
      refreshSession
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
