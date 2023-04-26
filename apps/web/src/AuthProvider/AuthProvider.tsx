import { Auth } from "aws-amplify";
import axios from "axios";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    selectAuthenticated,
    selectUserData,
    setAuthenticated,
    setCognitoUser,
    setUserData,
} from "src/state/slices/globalSlice";
import { setStudySets } from "src/state/slices/studysetsSlice";
import { useGetAllStudysetsQuery } from "src/state/api/studysets";

const AuthProvider = ({ children }) => {
    const dispatch = useDispatch();

    const authenticated = useSelector(selectAuthenticated);
    const { uuid: userUUID = ""} = useSelector(selectUserData);

    /* Skip option prevents hook from running when userUUID is undefined */
    const { data: studySets = [] } = useGetAllStudysetsQuery(
        userUUID ?? "", 
        { skip: !userUUID }
    );

    useEffect(() => {
        dispatch(setStudySets(studySets));
    }, [studySets]);

    const checkAuthState = async () => {
        try {
            const currentUser = await Auth.currentAuthenticatedUser();
            console.log("Testing current auth user = ", currentUser);
            // TODO: Review what you can do with this
            // const session = await Auth.currentSession();
            // console.log("Response from current session = ", session);

            dispatch(setAuthenticated(true));
            dispatch(setCognitoUser(currentUser));
            const { username } = currentUser;
            /* Retrieve user data, passing username as a query parameter */
            const response = await axios.get("/api/users/get", {
                params: {
                    username,
                },
            });

            console.log({ response });
            const userData = response.data;
            dispatch(setUserData(userData));
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        if (!authenticated) {
            console.log("Checking auth state 👀");
            checkAuthState();
        }
    }, []);

    return children;
};

export default AuthProvider;