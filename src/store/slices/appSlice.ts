import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  isLoading: boolean;
  sidebarOpen: boolean;
}

const initialState: AppState = {
  isLoading: false,
  sidebarOpen: true,
};

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { setLoading, toggleSidebar, setSidebarOpen } = appSlice.actions;
