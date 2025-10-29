import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface UIState {
  version: number
  theme: 'light' | 'dark' | 'system'
  extendedTime: boolean // 1.5x timer durations for accessibility
  toasts: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
    createdAt: number
  }>
  modals: {
    welcomeBack: boolean
    confirmReset: boolean
  }
}

const initialState: UIState = {
  version: 1,
  theme: 'system',
  extendedTime: false,
  toasts: [],
  modals: {
    welcomeBack: false,
    confirmReset: false,
  },
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<UIState['theme']>) => {
      state.theme = action.payload
    },
    setExtendedTime: (state, action: PayloadAction<boolean>) => {
      state.extendedTime = action.payload
    },
    addToast: (state, action: PayloadAction<Omit<UIState['toasts'][0], 'id' | 'createdAt'>>) => {
      const toast = {
        ...action.payload,
        id: `toast-${Date.now()}-${Math.random()}`,
        createdAt: Date.now(),
      }
      state.toasts.push(toast)
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload)
    },
    clearToasts: (state) => {
      state.toasts = []
    },
    setModal: (state, action: PayloadAction<{ modal: keyof UIState['modals']; open: boolean }>) => {
      state.modals[action.payload.modal] = action.payload.open
    },
  },
})

export const {
  setTheme,
  setExtendedTime,
  addToast,
  removeToast,
  clearToasts,
  setModal,
} = uiSlice.actions

export default uiSlice.reducer