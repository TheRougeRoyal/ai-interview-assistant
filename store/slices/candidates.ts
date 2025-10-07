import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Candidate {
  id: string
  profile: {
    name: string
    email: string
    phone: string
  }
  finalScore: number
  summary: string
  strengths: string[]
  gaps: string[]
  createdAt: number
  completedAt: number
}

export interface CandidatesState {
  version: number
  candidates: Candidate[]
}

const initialState: CandidatesState = {
  version: 1,
  candidates: [],
}

export const candidatesSlice = createSlice({
  name: 'candidates',
  initialState,
  reducers: {
    addCandidate: (state, action: PayloadAction<Candidate>) => {
      state.candidates.push(action.payload)
    },
    updateCandidate: (state, action: PayloadAction<{ id: string; updates: Partial<Candidate> }>) => {
      const index = state.candidates.findIndex(c => c.id === action.payload.id)
      if (index !== -1) {
        state.candidates[index] = { ...state.candidates[index], ...action.payload.updates }
      }
    },
    removeCandidate: (state, action: PayloadAction<string>) => {
      state.candidates = state.candidates.filter(c => c.id !== action.payload)
    },
    clearCandidates: (state) => {
      state.candidates = []
    },
  },
})

export const {
  addCandidate,
  updateCandidate,
  removeCandidate,
  clearCandidates,
} = candidatesSlice.actions

export default candidatesSlice.reducer