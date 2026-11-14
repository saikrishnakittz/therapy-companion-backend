import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient, createAuthenticatedClient, isSupabaseConfigured } from '../config/supabase';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

/**
 * POST /api/v1/auth/register
 * Registers a new user with Supabase Auth and initializes their profile record.
 */
export const register = async (
  req: Request<{}, {}, RegisterInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({
        success: false,
        message: 'Auth service is temporarily unavailable.',
      });
      return;
    }

    const { email, password, displayName } = req.body;
    const supabase = getSupabaseClient();

    // Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || 'Friend',
          full_name: displayName || 'Friend',
        },
      },
    });

    if (error) {
      const msg = error.message ? error.message.toLowerCase() : '';
      const isRateLimited =
        error.status === 429 ||
        error.code === 'over_email_send_rate_limit' ||
        error.code === 'over_request_rate_limit' ||
        msg.includes('rate limit');

      if (isRateLimited) {
        // Safe logging without passwords or sensitive credentials
        console.warn(
          `[AUTH] Rate limit triggered by Supabase Auth (Status: ${error.status || 429}, Code: ${error.code || 'over_email_send_rate_limit'})`
        );

        res.status(429).json({
          success: false,
          statusCode: 429,
          code: error.code || 'over_email_send_rate_limit',
          message:
            'Too many registration attempts. Please wait a few minutes before trying again.',
        });
        return;
      }

      if (
        msg.includes('already registered') ||
        msg.includes('already exists') ||
        msg.includes('unique constraint')
      ) {
        res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
        return;
      }

      res.status(error.status && error.status >= 400 && error.status < 500 ? error.status : 400).json({
        success: false,
        message: error.message || 'Unable to register user.',
      });
      return;
    }

    // In Supabase, if email confirmation is on and user exists, identities array may be empty
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
      return;
    }

    if (!data.user) {
      res.status(500).json({
        success: false,
        message: 'Registration completed but user object was not returned.',
      });
      return;
    }

    // If an active session is returned, ensure the profile record exists via authenticated client
    if (data.session) {
      try {
        const userClient = createAuthenticatedClient(data.session.access_token);
        await userClient.from('profiles').upsert(
          {
            id: data.user.id,
            display_name: displayName || 'Friend',
          },
          { onConflict: 'id' }
        );
      } catch (profileErr) {
        // SQL trigger on_auth_user_created handles profile creation as fallback
        console.warn('Profile upsert note:', profileErr);
      }
    }

    const emailConfirmed = Boolean(data.user.email_confirmed_at);
    const hasSession = Boolean(data.session);

    res.status(201).json({
      success: true,
      message: hasSession
        ? 'User registered successfully.'
        : 'User registered successfully. Please check your email for the confirmation link.',
      user: {
        id: data.user.id,
        email: data.user.email,
        displayName: displayName || data.user.user_metadata?.display_name || 'Friend',
        emailConfirmed,
      },
      session: data.session
        ? {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresIn: data.session.expires_in,
          expiresAt: data.session.expires_at,
        }
        : null,
      emailVerificationRequired: !hasSession,
    });
  } catch (err: any) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 * Authenticates user credentials with Supabase Auth and returns an access session.
 */
export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.status(503).json({
        success: false,
        message: 'Auth service is temporarily unavailable.',
      });
      return;
    }

    const { email, password } = req.body;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      const msg = error?.message ? error.message.toLowerCase() : '';
      const isRateLimited =
        error?.status === 429 ||
        error?.code === 'over_request_rate_limit' ||
        error?.code === 'over_email_send_rate_limit' ||
        msg.includes('rate limit');

      if (isRateLimited) {
        console.warn(
          `[AUTH] Login rate limit triggered by Supabase Auth (Status: ${error?.status || 429}, Code: ${error?.code || 'over_request_rate_limit'})`
        );

        res.status(429).json({
          success: false,
          statusCode: 429,
          code: error?.code || 'over_request_rate_limit',
          message:
            'Too many login attempts. Please wait a few minutes before trying again.',
        });
        return;
      }

      if (msg.includes('email not confirmed')) {
        res.status(403).json({
          success: false,
          message: 'Email address has not been verified. Please check your email for the verification link.',
        });
        return;
      }

      // Return consistent 401 for incorrect credentials
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Retrieve user profile using authenticated client to ensure RLS compliance
    let displayName = data.user.user_metadata?.display_name || 'Friend';
    try {
      const userClient = createAuthenticatedClient(data.session.access_token);
      const { data: profile } = await userClient
        .from('profiles')
        .select('display_name')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.display_name) {
        displayName = profile.display_name;
      }
    } catch {
      // Fallback to user metadata
    }

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: data.user.id,
        email: data.user.email,
        displayName,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
        expiresAt: data.session.expires_at,
      },
    });
  } catch (err: any) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 * Revokes the current authenticated session.
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.supabase) {
      await req.supabase.auth.signOut();
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err: any) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 * Retrieves current authenticated user details and their associated profile.
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user!;
    const userClient = req.supabase!;

    // Query profiles table respecting RLS
    const { data: profile, error } = await userClient
      .from('profiles')
      .select('id, display_name, primary_goal, preferred_tone, reminder_preference, created_at, updated_at')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile record.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        emailConfirmed: Boolean(user.email_confirmed_at),
        createdAt: user.created_at,
      },
      profile: profile || null,
    });
  } catch (err: any) {
    next(err);
  }
};
