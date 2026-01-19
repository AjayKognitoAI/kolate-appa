// store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import projectsReducer from "./slices/projectsSlice";
import moduleAccessReducer from "./slices/moduleAccessSlice";
import notificationSlice from "./slices/notificationSlice";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";

const store = configureStore({
  reducer: {
    projects: projectsReducer,
    moduleAccess: moduleAccessReducer,
    notifications: notificationSlice,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
