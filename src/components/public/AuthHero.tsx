import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, CheckCircle, Link as LinkIcon, Home, DollarSign } from 'lucide-react';
import { createSlug } from '@/lib/formatters';
import { toast } from 'sonner';
import { sanitizeInput, sanitizeEmail, sanitizePhoneNumber } from '@/lib/sanitize';
import { checkRateLimit } from '@/lib/validation';
import { logger } from '@/lib/logger';

const REAL_ESTATE_COMPANIES = [
  "Noah Real Estate",
  "Gift Real Estate",
  "Flintstone Homes",
  "Afro-Tsion Real Estate",
  "Ayat Share Company",
  "Sunshine Real Estate",
  "Zemen Bank Real Estate",
  "Tsehay Real Estate",
  "Other"
] as const;

const AuthHero: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'signIn' | 'signUp'>('signIn');
  const navigate = useNavigate();
  const { userRole } = useAuth();

  // Form states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const [signUpFirstName, setSignUpFirstName] = useState('');
  const [signUpLastName, setSignUpLastName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpPhoneNumber, setSignUpPhoneNumber] = useState('');
  const [signUpCompany, setSignUpCompany] = useState<typeof REAL_ESTATE_COMPANIES[number] | ''>('');
  const [signUpOtherCompany, setSignUpOtherCompany] = useState('');
  const [showOtherCompanyInput, setShowOtherCompanyInput] = useState(false);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  useEffect(() => {
    // Check if there's a stored auth mode preference
    const authMode = localStorage.getItem('authMode');
    if (authMode === 'signup') {
      setActiveTab('signUp');
    } else if (authMode === 'signin') {
      setActiveTab('signIn');
    }
    
    // Clear the stored preference
    localStorage.removeItem('authMode');
    
    if (signUpCompany === 'Other') {
      setShowOtherCompanyInput(true);
    } else {
      setShowOtherCompanyInput(false);
      setSignUpOtherCompany('');
    }
  }, [signUpCompany]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!signInEmail || !signInPassword) {
      setErrorMessage('Please fill in all fields for sign-in.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(signInEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    try {
      // Check rate limit
      const rateLimitKey = `signin_${signInEmail}`;
      if (!checkRateLimit(rateLimitKey, 5, 60000)) {
        setErrorMessage('Too many sign-in attempts. Please try again in a minute.');
        setIsLoading(false);
        return;
      }
      
      // Check if Supabase URL and key are defined
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error("Missing Supabase credentials. Please check ENV-SETUP.md for configuration instructions.");
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizeEmail(signInEmail),
        password: signInPassword,
      });
      
      if (error) {
        // Handle Supabase auth errors with more specific messages
        if (error.message === 'Invalid API key') {
          throw new Error('Authentication error: Invalid Supabase API key. Please check your environment variables.');
        } else {
          throw error;
        }
      }
      
      if (data.user) {
        try {
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (roleError) {
            logger.error('Error fetching role after sign in:', roleError);
          }

          const role = roleData?.role;

          if (role === 'super_admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        } catch (roleFetchError) {
          logger.error('Unexpected error fetching role after sign in:', roleFetchError);
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      // Provide a more detailed error message for common issues
      let errorMsg = error.message || 'Failed to sign in.';
      
      if (errorMsg.includes('Invalid API key')) {
        errorMsg = 'Authentication error: Missing or invalid Supabase credentials. Please check ENV-SETUP.md for setup instructions.';
      } else if (errorMsg.includes('Invalid login credentials')) {
        errorMsg = 'Invalid email or password. Please try again.';
      } else if (errorMsg.includes('rate limit')) {
        errorMsg = 'Too many sign-in attempts. Please try again in a few minutes.';
      }
      
      setErrorMessage(errorMsg);
      logger.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!signUpFirstName || !signUpLastName || !signUpEmail || !signUpPassword || !signUpPhoneNumber || !signUpCompany) {
      setErrorMessage('Please fill in all required fields for sign-up.');
      return;
    }
    if (signUpCompany === 'Other' && !signUpOtherCompany) {
      setErrorMessage('Please specify your company name.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(signUpEmail)) {
      setErrorMessage('Please enter a valid email address for sign-up.');
      return;
    }
    if (signUpPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (signUpPhoneNumber.replace(/\D/g, '').length < 10) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }
    setIsLoading(true);
    const companyToSubmit = signUpCompany === 'Other' ? sanitizeInput(signUpOtherCompany) : signUpCompany;

    try {
      // Check rate limit
      const rateLimitKey = `signup_${signUpEmail}`;
      if (!checkRateLimit(rateLimitKey, 3, 300000)) {
        setErrorMessage('Too many sign-up attempts. Please try again in 5 minutes.');
        setIsLoading(false);
        return;
      }
      // Create user using Supabase Functions client
      // For signup, we need to use the anon key since there's no user session yet
      // Create a temporary Supabase client with explicit anon key for the function call
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Use fetch with proper headers - Supabase Edge Functions accept anon key as Bearer token
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          email: sanitizeEmail(signUpEmail),
          password: signUpPassword,
          user_metadata: {
            first_name: sanitizeInput(signUpFirstName),
            last_name: sanitizeInput(signUpLastName),
            phone_number: sanitizePhoneNumber(signUpPhoneNumber),
            company: companyToSubmit ? sanitizeInput(companyToSubmit) : null,
            career: 'real_estate_agent', // Default career for all signups
          }
        })
      });

      // Parse response
      let userData: any = null;
      let errorData: any = null;
      
      try {
        const responseText = await response.text();
        const parsed = responseText ? JSON.parse(responseText) : {};
        
        if (!response.ok) {
          errorData = parsed;
        } else {
          userData = parsed;
        }
      } catch (parseError) {
        logger.error('Failed to parse response:', parseError);
        if (!response.ok) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
      }

      // Handle errors
      if (!response.ok || errorData) {
        logger.error('User creation error:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        
        // Extract error message from response
        const errorMessage = errorData?.error || errorData?.message || `HTTP ${response.status}: ${response.statusText}`;
        let errorMsg = 'Failed to create account. ';
        
        if (errorMessage.includes('already exists') || errorMessage.includes('already registered') || errorMessage.includes('User already registered')) {
          errorMsg = 'An account with this email already exists. Please sign in or use a different email.';
        } else if (errorMessage.includes('invalid email') || errorMessage.includes('Email') || errorMessage.includes('Invalid email')) {
          errorMsg = 'Please enter a valid email address.';
        } else if (errorMessage.includes('password') || errorMessage.includes('Password')) {
          errorMsg = 'Password must be at least 6 characters long.';
        } else if (errorMessage.includes('Missing required field')) {
          errorMsg = `Sign up failed: ${errorMessage}. Please fill in all required fields.`;
        } else if (errorMessage.includes('profile') || errorMessage.includes('Profile')) {
          errorMsg = `Account creation failed: ${errorMessage}. Please try again or contact support.`;
        } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
          errorMsg = 'Authentication failed. Please refresh the page and try again.';
        } else {
          // Use the actual error message if available
          errorMsg = errorMessage && errorMessage !== 'Failed to create account. ' 
            ? (errorMessage.length > 150 
                ? `Failed to create account: ${errorMessage.substring(0, 150)}...` 
                : `Failed to create account: ${errorMessage}`)
            : 'Failed to create account. Please check your information and try again.';
        }
        
        logger.error('Parsed error message:', errorMsg);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (!userData?.user?.id) {
        const errorMsg = 'Account creation failed. Please try again.';
        logger.error('No user ID in response:', userData);
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }

      // The Edge Function now handles profile creation, including slug generation
      setSignUpSuccess(true);
      toast.success('Account created successfully!', {
        description: 'Please check your email to verify your account. You can sign in after verification.',
        duration: 6000
      });
      
      // Reset form and switch to sign in
      setActiveTab('signIn');
      setSignInEmail(signUpEmail);
      setSignInPassword('');
      setSignUpFirstName('');
      setSignUpLastName('');
      setSignUpEmail('');
      setSignUpPassword('');
      setSignUpPhoneNumber('');
      setSignUpCompany('');
      setSignUpOtherCompany('');
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to sign up. Please try again.';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      logger.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const inputBaseClasses = "w-full p-2.5 sm:p-3 text-sm sm:text-base bg-[var(--portal-input-bg)] text-[var(--portal-input-text)] rounded-md border border-[var(--portal-input-border)] focus:ring-2 focus:ring-[var(--portal-accent)] focus:border-transparent placeholder-[var(--portal-text-secondary)]";
  const buttonBaseClasses = "w-full bg-[var(--portal-button-bg)] hover:bg-[var(--portal-button-hover)] text-[var(--portal-button-text)] font-semibold p-2.5 sm:p-3 text-sm sm:text-base rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)] focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transform";

  return (
    <div className="relative min-h-screen flex items-center justify-center py-4 sm:py-6 md:py-8 overflow-hidden">
      {/* Hero Background Image - no effects */}
      <img
        src="/HeroBG.jpg"
        alt="Hero Background"
        className="absolute inset-0 w-full h-full object-cover z-0"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      />
      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 md:px-8 relative z-10 flex flex-col lg:flex-row items-start gap-6 lg:gap-0">
        {/* Left side - Hero Text */}
        <div className="w-full lg:w-1/2 lg:pr-12 mt-0 lg:mt-0">
          <div className="flex justify-center lg:justify-start mb-0">
            <img src="/LogoIcon.svg" alt="Company Logo" className="h-32 sm:h-40 md:h-48 lg:h-48 transform hover:scale-105 transition-transform duration-300" />
          </div>
          
          <motion.h1 
            className="-mt-4 sm:-mt-6 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-6 text-center lg:text-left text-black"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            Your Real Estate.
            <span className="relative text-transparent bg-clip-text bg-gradient-to-r from-[var(--portal-accent)] to-[#ff5a5a]"> Your Brand.</span>
          </motion.h1>
        </div>
        {/* Right side - Auth Form */}
        <div className="w-full lg:w-1/2 lg:pl-12">
          <style>{`
            /* Custom scrollbar styling for auth form */
            .auth-form-scroll::-webkit-scrollbar {
              width: 6px;
            }
            .auth-form-scroll::-webkit-scrollbar-track {
              background: transparent;
              margin: 8px 0;
            }
            .auth-form-scroll::-webkit-scrollbar-thumb {
              background: rgba(0, 0, 0, 0.2);
              border-radius: 3px;
            }
            .auth-form-scroll::-webkit-scrollbar-thumb:hover {
              background: rgba(0, 0, 0, 0.3);
            }
          `}</style>
          <motion.div 
            className="bg-[var(--portal-card-bg)] p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-[var(--portal-accent)] relative overflow-visible md:overflow-hidden min-h-[400px] sm:min-h-[450px] md:h-[480px] max-w-md mx-auto w-full flex flex-col max-h-[90vh] md:max-h-[480px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="flex mb-4 sm:mb-6 border-b border-[var(--portal-border)] flex-shrink-0">
          <button
            className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 text-center text-sm sm:text-base font-semibold transition-colors duration-300 ${
              activeTab === 'signIn'
                ? 'text-[var(--portal-accent)] border-b-2 border-[var(--portal-accent)]'
                : 'text-[var(--portal-text-secondary)] hover:text-[var(--portal-accent)] focus:outline-none'
            }`}
            onClick={() => { setActiveTab('signIn'); setErrorMessage(null); }}
          >
            Sign In
          </button>
          <button
            className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 text-center text-sm sm:text-base font-semibold transition-colors duration-300 ${
              activeTab === 'signUp'
                ? 'text-[var(--portal-accent)] border-b-2 border-[var(--portal-accent)]'
                : 'text-[var(--portal-text-secondary)] hover:text-[var(--portal-accent)] focus:outline-none'
            }`}
            onClick={() => { setActiveTab('signUp'); setErrorMessage(null); }}
          >
            Sign Up
          </button>
        </div>

        {errorMessage && (
              <div className="mb-4 sm:mb-6 p-2 sm:p-3 bg-red-700/30 border border-red-600 text-red-400 rounded-md text-center text-sm sm:text-base flex-shrink-0">
            {errorMessage}
          </div>
        )}

          {/* Form Container - Always in flex layout */}
          <div className="flex-1 min-h-0 flex flex-col relative overflow-y-auto overflow-x-hidden auth-form-scroll" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.2) transparent', paddingRight: '8px' }}>
            {/* Sign In Form */}
            <div className={`transition-opacity duration-300 w-full ${activeTab === 'signIn' ? 'opacity-100 pointer-events-auto block' : 'opacity-0 pointer-events-none hidden'}`}>
              <form onSubmit={handleSignIn} className="space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-[var(--portal-label-text)]">Email</label>
                <input
                    id="email"
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="your@email.com"
                  className={inputBaseClasses}
                  disabled={isLoading}
                />
              </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-[var(--portal-label-text)]">Password</label>
                <input
                    id="password"
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                  className={inputBaseClasses}
                  disabled={isLoading}
                />
              </div>
                
              <button
                type="submit"
                className={buttonBaseClasses}
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>

          {/* Sign Up Form */}
            <div className={`transition-opacity duration-300 w-full ${activeTab === 'signUp' ? 'opacity-100 pointer-events-auto block' : 'opacity-0 pointer-events-none hidden'}`}>
              {signUpSuccess && (
                <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-700/30 border border-green-600 text-green-400 rounded-md text-center text-sm sm:text-base">
                  Sign up successful! Redirecting to your portal...
                </div>
              )}
              <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="firstName" className="block text-xs sm:text-sm font-medium text-[var(--portal-label-text)]">First Name</label>
                  <input
                      id="firstName"
                    type="text"
                    value={signUpFirstName}
                    onChange={(e) => setSignUpFirstName(sanitizeInput(e.target.value))}
                      
                    className={inputBaseClasses}
                    disabled={isLoading}
                  />
                </div>
                  
                  <div className="space-y-1.5 sm:space-y-2">
                    <label htmlFor="lastName" className="block text-xs sm:text-sm font-medium text-[var(--portal-label-text)]">Last Name</label>
                  <input
                      id="lastName"
                    type="text"
                    value={signUpLastName}
                    onChange={(e) => setSignUpLastName(sanitizeInput(e.target.value))}
                      
                    className={inputBaseClasses}
                    disabled={isLoading}
                  />
                </div>
              </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="signUpEmail" className="block text-xs sm:text-sm font-medium text-[var(--portal-label-text)]">Email</label>
                <input
                    id="signUpEmail"
                  type="email"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(sanitizeEmail(e.target.value))}
                    
                  className={inputBaseClasses}
                  disabled={isLoading}
                />
              </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="signUpPassword" className="block text-xs sm:text-sm font-medium text-[var(--portal-label-text)]">Password</label>
                <input
                    id="signUpPassword"
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                    
                  className={inputBaseClasses}
                  disabled={isLoading}
                />
              </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="phoneNumber" className="block text-xs sm:text-sm font-medium text-[var(--portal-label-text)]">Phone Number</label>
                <input
                    id="phoneNumber"
                  type="tel"
                  value={signUpPhoneNumber}
                  onChange={(e) => setSignUpPhoneNumber(sanitizePhoneNumber(e.target.value))}
                    
                  className={inputBaseClasses}
                  disabled={isLoading}
                />
              </div>
                
                <div className="space-y-1.5 sm:space-y-2">
                  <label htmlFor="company" className="block text-xs sm:text-sm font-medium text-[var(--portal-label-text)]">Company</label>
                <select
                    id="company"
                  value={signUpCompany}
                  onChange={(e) => setSignUpCompany(e.target.value as typeof REAL_ESTATE_COMPANIES[number] | '')}
                    className={inputBaseClasses}
                  disabled={isLoading}
                >
                    <option value="">Select a company</option>
                  {REAL_ESTATE_COMPANIES.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
                
              {showOtherCompanyInput && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <label htmlFor="otherCompany" className="block text-xs sm:text-sm font-medium text-[var(--portal-label-text)]">Specify Company</label>
                  <input
                      id="otherCompany"
                    type="text"
                    value={signUpOtherCompany}
                    onChange={(e) => setSignUpOtherCompany(sanitizeInput(e.target.value))}
                      placeholder="Your company name"
                    className={inputBaseClasses}
                    disabled={isLoading}
                  />
                </div>
              )}
                
              <button
                type="submit"
                className={buttonBaseClasses}
                disabled={isLoading || signUpSuccess}
              >
                {isLoading ? 'Signing Up...' : 'Sign Up'}
              </button>
            </form>
          </div>
          </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthHero;