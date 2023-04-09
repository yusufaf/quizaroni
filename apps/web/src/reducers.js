import { combineReducers } from "redux";
import globalReducer from "src/slices/globalSlice"
import studySetsReducer from "src/slices/studysetsSlice"

const allReducers = combineReducers(
    {
        global: globalReducer,
        studySets: studySetsReducer
    }
);

export default allReducers;