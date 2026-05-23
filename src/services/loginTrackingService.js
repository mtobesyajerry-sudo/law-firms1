import { supabase } from '../supabaseClient';

class LoginTrackingService {
  async getClientIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Failed to fetch IP:', error);
      return null;
    }
  }

  async logLoginAttempt(email, success, user = null, failureReason = null, mfaUsed = false) {
    try {
      const ipAddress = await this.getClientIP();
      const userAgent = navigator.userAgent;

      const loginEntry = {
        user_id: user?.id || null,
        email: email,
        success: success,
        failure_reason: failureReason,
        // login_history.ip_address is inet — null is safe; 'unknown' is not a valid inet
        ip_address: ipAddress || null,
        user_agent: userAgent,
        mfa_used: mfaUsed === true
      };

      const { error } = await supabase
        .from('login_history')
        .insert([loginEntry]);

      if (error) {
        console.error(`[AUDIT FAILURE] Insert to login_history rejected: ${error.message} | code: ${error.code} | email: ${email}`);
      }

      if (!success) {
        await this.logFailedAttempt(email, ipAddress, failureReason);
      }

      return loginEntry;
    } catch (err) {
      console.error(`[AUDIT FAILURE] Unexpected error in logLoginAttempt: ${err?.message ?? err}`);
    }
  }

  async logFailedAttempt(email, ipAddress, reason) {
    try {
      const { data: existing } = await supabase
        .from('failed_login_attempts')
        .select('id, attempt_count')
        .eq('email', email)
        .gte('last_attempt_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existing) {
        const newCount = (existing.attempt_count || 0) + 1;
        await supabase
          .from('failed_login_attempts')
          .update({
            attempt_count: newCount,
            last_attempt_at: new Date().toISOString(),
            ip_addresses: supabase.rpc('array_append', { arr: [], val: ipAddress })
          })
          .eq('id', existing.id);

        if (newCount >= 5) {
          await this.createSecurityAlert(email, ipAddress, newCount);
        }
      } else {
        await supabase
          .from('failed_login_attempts')
          .insert([{
            email: email,
            attempt_count: 1,
            last_attempt_at: new Date().toISOString(),
            // ip_address is text NOT NULL — fall back to 'unknown' (not inet type here)
            ip_address: ipAddress || 'unknown',
            failure_reason: reason
          }]);
      }
    } catch (err) {
      console.error(`[AUDIT FAILURE] Unexpected error in logFailedAttempt: ${err?.message ?? err}`);
    }
  }

  async createSecurityAlert(email, ipAddress, attemptCount) {
    try {
      await supabase
        .from('suspicious_activity_alerts')
        .insert([{
          alert_type: 'multiple_failed_logins',
          severity: attemptCount >= 10 ? 'critical' : 'high',
          description: `${attemptCount} failed login attempts for ${email}`,
          user_email: email,
          ip_address: ipAddress,
          metadata: {
            attempt_count: attemptCount,
            timeframe: '15 minutes'
          },
          status: 'open'
        }]);
    } catch (error) {
      console.error('Failed to create security alert:', error);
    }
  }

  async createSession(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const ipAddress = await this.getClientIP();

      if (session) {
        // Use session_id from JWT payload — unique per Supabase auth session.
        // Fallback to a random UUID if the claim is absent (should never happen).
        let sessionToken;
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]));
          sessionToken = payload.session_id || crypto.randomUUID();
        } catch {
          sessionToken = crypto.randomUUID();
        }

        const sessionEntry = {
          user_id: userId,
          session_token: sessionToken,
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
          is_active: true,
          last_activity_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };

        const { data, error } = await supabase
          .from('user_sessions')
          .insert([sessionEntry])
          .select()
          .single();

        if (error) {
          console.error('Failed to create session:', error);
        }

        return data;
      }
    } catch (error) {
      console.error('Session creation error:', error);
    }
  }

  async endSession(userId) {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        let sessionToken;
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]));
          sessionToken = payload.session_id || null;
        } catch {
          sessionToken = null;
        }

        const query = supabase
          .from('user_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (sessionToken) {
          query.eq('session_token', sessionToken);
        } else {
          query.eq('is_active', true);
        }

        await query;
      }
    } catch (error) {
      console.error('Session end error:', error);
    }
  }

  async endAllUserSessions(userId) {
    try {
      await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_active', true);
    } catch (error) {
      console.error('End all sessions error:', error);
    }
  }

  async getActiveSessionCount(userId) {
    try {
      const { count, error } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting session count:', error);
      return 0;
    }
  }

  async getRecentLoginHistory(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('login_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching login history:', error);
      return [];
    }
  }
}

export const loginTrackingService = new LoginTrackingService();
