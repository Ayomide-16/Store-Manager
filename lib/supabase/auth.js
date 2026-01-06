/**
 * Authentication Service
 * 
 * This module handles all authentication operations using Supabase Auth.
 */

import { supabase, supabaseAdmin } from './client'

/**
 * Sign up a new user and create their profile with auto-confirmed email.
 * This resolves the "Email not confirmed" error by using privileged admin access.
 * 
 * @param {Object} credentials - User signup information
 */
export async function signUp({ email, password, fullName, role, shopName }) {
  try {
    // 1. Create the user using the Service Role (Admin) client.
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
        shop_name: shopName
      }
    });

    if (createError) {
      // If user already exists, transition to sign in to make onboarding smoother
      if (createError.message.includes("already registered")) {
        return await signIn({ email, password });
      }
      throw createError;
    }

    // 2. Sign the user in using the standard client
    return await signIn({ email, password });
  } catch (error) {
    console.error('Signup error:', error.message || error);
    return { data: null, error };
  }
}

/**
 * Sign in an existing user with robust handling for unconfirmed emails.
 * 
 * @param {Object} credentials - Login credentials
 */
export async function signIn({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      // Logic to auto-confirm demo or previously created accounts to bypass email validation errors
      if (error.message?.includes("Email not confirmed") || error.message?.includes("Invalid login credentials")) {
        // Only try to find and confirm if it's a known email or if we want to be helpful
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (!listError && listData?.users) {
          const targetUser = listData.users.find(u => u.email?.toLowerCase() === email?.toLowerCase());
          
          if (targetUser && targetUser.id) {
            // Confirm the user manually since we have the ID and correct creds might follow
            await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
            
            // Re-attempt sign in now that email is confirmed
            return await supabase.auth.signInWithPassword({ email, password });
          }
        }
      }
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Sign in error details:', error);
    return { data: null, error };
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Sign out error:', error.message || error)
    return { error }
  }
}