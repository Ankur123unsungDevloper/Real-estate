"use client";

import { useEffect } from "react";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { setupListeners } from "@reduxjs/toolkit/query";
import globalReducer from "@/state";
import { api } from "@/state/api";

/* REDUX STORE */
const rootReducer = combineReducers({
  global: globalReducer,
  [api.reducerPath]: api.reducer,
});

export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(api.middleware),
  });
};

/* REDUX TYPES */
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/* PROVIDER */

// Create the store once at module level so it's never recreated
const store = makeStore();

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const unsubscribe = setupListeners(store.dispatch);
    return unsubscribe;
  }, []);

  return <Provider store={store}>{children}</Provider>;
}