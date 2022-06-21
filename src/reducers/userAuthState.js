import { createSlice } from '@reduxjs/toolkit'

export const userAuthSlice = createSlice({
  name: 'userAuthState',
  initialState: {
  },
  reducers: {
    setUserAuthState: (state, action) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes

      /* Do we need the value attribute here? */
      state = action.payload;
    },
  },
})

// Action creators are generated for each case reducer function
export const { setUserAuthState } = userAuthSlice.actions

export default userAuthSlice.reducer