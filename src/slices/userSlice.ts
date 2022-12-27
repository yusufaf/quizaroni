import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState = {
    authState: []
}

export const userSlice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setAuthState: (state, action: PayloadAction<any>) => {
            state.authState = action.payload;
        }
    },
})

export const { setAuthState } = userSlice.actions;

export const selectUserAuthState = (state) => state.user.authState;

export default userSlice.reducer;