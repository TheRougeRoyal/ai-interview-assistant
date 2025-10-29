import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { fetchAPI } from '@/lib/http/apiClient'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export interface AuthUser {
  id: string
  email: string
  role: 'interviewer' | 'interviewee'
  name?: string | null
  phone?: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isInitialized: false
}

// Async thunks for API calls
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword(credentials)
      if (error || !data?.user || !data?.session) {
        return rejectWithValue(error?.message || 'Invalid email or password')
      }

      const u = data.user
      const role = (u.user_metadata?.role as 'interviewer' | 'interviewee') || 'interviewee'
      const payload = {
        user: {
          id: u.id,
          email: u.email || '',
          role,
          name: (u.user_metadata?.name as string | undefined) ?? null,
          phone: (u.user_metadata?.phone as string | undefined) ?? null,
          createdAt: new Date(u.created_at).toISOString(),
          updatedAt: new Date((u as any).updated_at || u.last_sign_in_at || u.created_at).toISOString(),
        },
        token: data.session.access_token,
      }
      return payload
    } catch (err: any) {
      if (err?.message) return rejectWithValue(err.message)
      return rejectWithValue('Network error')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (
    userData: { email: string; password: string; role: 'interviewer' | 'interviewee'; name?: string; phone?: string },
    { rejectWithValue }
  ) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            role: userData.role,
            ...(userData.name ? { name: userData.name } : {}),
            ...(userData.phone ? { phone: userData.phone } : {}),
          },
        },
      })

      if (error) return rejectWithValue(error.message)

      // If email confirmation is required, session may be null
      if (!data?.user) return rejectWithValue('Sign up successful. Please verify your email to continue.')

      // If session exists, treat as logged in; otherwise ask user to sign in
      if (!data.session) {
        return rejectWithValue('Sign up successful. Please sign in after verifying your email.')
      }

      const u = data.user
      const role = (u.user_metadata?.role as 'interviewer' | 'interviewee') || 'interviewee'
      return {
        user: {
          id: u.id,
          email: u.email || '',
          role,
          name: (u.user_metadata?.name as string | undefined) ?? null,
          phone: (u.user_metadata?.phone as string | undefined) ?? null,
          createdAt: new Date(u.created_at).toISOString(),
          updatedAt: new Date((u as any).updated_at || u.last_sign_in_at || u.created_at).toISOString(),
        },
        token: data.session.access_token,
      }
    } catch (err: any) {
      if (err?.message) return rejectWithValue(err.message)
      return rejectWithValue('Network error')
    }
  }
)

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) return rejectWithValue('Not authenticated')
      const u = data.user
      const role = (u.user_metadata?.role as 'interviewer' | 'interviewee') || 'interviewee'
      return {
        user: {
          id: u.id,
          email: u.email || '',
          role,
          name: (u.user_metadata?.name as string | undefined) ?? null,
          phone: (u.user_metadata?.phone as string | undefined) ?? null,
          createdAt: new Date(u.created_at).toISOString(),
          updatedAt: new Date((u as any).updated_at || u.last_sign_in_at || u.created_at).toISOString(),
        },
        token: sessionData?.session?.access_token || null,
      }
    } catch (error) {
      const err: any = error
      if (err?.message) return rejectWithValue(err.message)
      return rejectWithValue('Network error')
    }
  }
)

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signOut()
      if (error) return rejectWithValue(error.message)
      return { ok: true }
    } catch (error) {
      const err: any = error
      if (err?.message) return rejectWithValue(err.message)
      return rejectWithValue('Network error')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setInitialized: (state) => {
      state.isInitialized = true
    },
    clearAuth: (state) => {
      state.user = null
      state.token = null
      state.error = null
      state.isLoading = false
    }
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.error = null
        state.isInitialized = true
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.user = null
        state.token = null
      })

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.error = null
        state.isInitialized = true
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.user = null
        state.token = null
      })

    // Fetch current user
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.error = null
        state.isInitialized = true
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.user = null
        state.token = null
        state.isInitialized = true
      })

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.error = null
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  }
})

export const { clearError, setInitialized, clearAuth } = authSlice.actions
export default authSlice.reducer