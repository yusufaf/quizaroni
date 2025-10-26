import { configureStore } from '@reduxjs/toolkit';
import api from './api/api';
import loggerMiddleware from './middleware/logger';

const isDevelopment = import.meta.env.DEV;

const { reducerPath: apiPath, reducer: apiReducer } = api;

const middlewares = [api.middleware];
if (isDevelopment) {
    middlewares.push(loggerMiddleware);
}

export const store = configureStore({
    reducer: {
        [apiPath]: apiReducer,
    },
    middleware: (getDefaultMiddleware) => {
        return getDefaultMiddleware().concat(middlewares);
    },
    devTools: isDevelopment,
});

export type AppStore = typeof store;
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
// export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;
