import { getCurrentUser } from "aws-amplify/auth";
import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from 'state/reduxHooks';
import {
    selectAuthenticated,
    setAuthenticated,
    setCognitoUser,
} from "state/slices/globalSlice";

type Props = {
    children: any;
};
const AuthProvider = ({ children }: Props) => {
    const dispatch = useAppDispatch();

    const authenticated = useAppSelector(selectAuthenticated);

    const checkAuthState = async () => {
        try {
            const currentUser = await getCurrentUser();
            dispatch(setAuthenticated(true));
            dispatch(
                setCognitoUser({
                    username: currentUser.username,
                })
            );
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        if (!authenticated) {
            checkAuthState();
        }
    }, []);

    return children;
};

export default AuthProvider;
