import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Anon Key are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Auth methods
  async signUp(email: string, password: string, userData?: any) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  }

  async createUser(email: string, password: string, userData?: any) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData,
    });
    return { data, error };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  async getUser(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);
    return { data, error };
  }

  // Database methods
  from(table: string) {
    return this.supabase.from(table);
  }

  // Secure user data methods
  async getUserProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  }

  async updateUserProfile(userId: string, profileData: any) {
    const { data, error } = await this.supabase
      .from('users')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  }

  async createUserChart(userId: string, chartData: any) {
    const { data, error } = await this.supabase
      .from('charts')
      .insert({
        user_id: userId,
        data: chartData,
      })
      .select()
      .single();
    return { data, error };
  }

  async getUserCharts(userId: string) {
    const { data, error } = await this.supabase
      .from('charts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  }

  // Real-time subscriptions
  subscribe(table: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
  }
}
