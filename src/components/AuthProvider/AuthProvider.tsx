import { getCurrentUser } from 'aws-amplify/auth';
import axios from "axios";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    selectAuthenticated,
    selectUserData,
    setAuthenticated,
    setCognitoUser,
    setUserData,
} from "state/slices/globalSlice";
import { setStudySets } from "state/slices/studysetsSlice";
import { useGetAllStudysetsQuery } from "state/api/studysetsAPI";

type Props = {
    children: any;
};

const AuthProvider = ({ children }: Props) => {
    const dispatch = useDispatch();

    const authenticated = useSelector(selectAuthenticated);
    const { uuid: userUUID = "" } = useSelector(selectUserData);

    /* Skip option prevents hook from running when userUUID is undefined */
    const { data: studySets = [] } = useGetAllStudysetsQuery(
        {
            userUUID: userUUID ?? "",
        },
        { skip: !userUUID }
    );

    useEffect(() => {
        dispatch(setStudySets(studySets));
    }, [studySets]);

    const checkAuthState = async () => {
        try {
            const currentUser = await getCurrentUser();
            console.log("Testing current auth user = ", currentUser);

            /* Removing unneeded properties to make the CognitoUser object serializable in redux */
            const modifiedCognitoUser = {...currentUser};
            const propertiesToRemove = ["signInUserSession", "pool", "storage", "client"];
            propertiesToRemove.forEach((property) => delete modifiedCognitoUser[property]);

            dispatch(setAuthenticated(true));
            dispatch(setCognitoUser(modifiedCognitoUser));
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
