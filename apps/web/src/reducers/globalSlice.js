import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    alert: {},
    
}

export const userAuthSlice = createSlice({
  // Slice has a name, used in action types
  name: 'userAuthState',
  // The initial state for the reducer
  initialState: {},
  // An object of "case reducers". Key names will be used to generate actions.
  reducers: {
    setUserAuthState: (state, action) => {
      state = action.payload;
    },
    setAlert: (state, action) => {
      state = action.payload;
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
} = userAuthSlice.actions

export default userAuthSlice.reducer