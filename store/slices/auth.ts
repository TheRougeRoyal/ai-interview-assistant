import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { fetchAPI } from '@/lib/http/apiClient'

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
      // fetchAPI throws APIError with status/code when response is not ok
      const data = await fetchAPI('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      return data
    } catch (err: any) {
      // If the API returned structured error, forward its message
      if (err?.message) return rejectWithValue(err.message)
      return rejectWithValue('Network error')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData: { email: string; password: string; role: 'interviewer' | 'interviewee'; name?: string; phone?: string }, { rejectWithValue }) => {
    try {
      const data = await fetchAPI('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })

      return data
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
      const data = await fetchAPI('/api/auth/me')
      return data
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
      const data = await fetchAPI('/api/auth/logout', { method: 'POST' })
      return data
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