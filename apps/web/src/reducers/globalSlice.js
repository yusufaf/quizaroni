import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    alert: {},
    userAuthInfo: {}
}

export const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    setUserAuthState: (state, action) => {
      state.userAuthInfo = action.payload;
    },
    setAlert: (state, action) => {
      state.alert = action.payload;
    },
    /* Customizing a generated action creator 
     addTodo: {
      reducer: (state, action) => {
        state.push(action.payload)
      },
      prepare: (text) => {
        const id = nanoid()
        return { payload: { id, text } }
      },
    },
    */
  },
  // A "builder callback" function used to add more reducers, or
  // an additional object of "case reducers", where the keys should be other
  // action types
})

// Action creators are generated for each case reducer function
export const { 
  setUserAuthState,
  setAlert
} = globalSlice.actions

export const selectAlert = (state) => state.global.alert;
export const selectUserAuthState = (state) => state.global.userAuthInfo;

export default globalSlice.reducer