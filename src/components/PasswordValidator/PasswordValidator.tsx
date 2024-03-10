import { CSSProperties, useEffect, useMemo } from "react";
import { Dispatch, SetStateAction, useState } from "react";
import { PWD_REGEX } from "utilities/constants";
import { PasswordPolicyContainer, RequirementText } from "./styles";
import { AnimatePresence } from "framer-motion";

const CHECKMARK_UNICODE = "\u2713";
const X_UNICODE = "\u2715";

type RequirementState = {
    length: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    uppercase: boolean;
};

type Props = {
    isPasswordValid?: boolean;
    setIsPasswordValid: Dispatch<SetStateAction<boolean>>;
    password: string;
    style?: CSSProperties;
};

const initialRequirementState: RequirementState = {
    length: false,
    lowercase: false,
    number: false,
    special: false,
    uppercase: false,
};

const REQUIREMENT_MESSAGES: { [key: string]: string } = {
    length: "Must be at least 8 characters long",
    lowercase: "Must contain at least one lowercase letter",
    number: "Must contain at least one number",
    special: "Must contain at least one special character",
    uppercase: "Must contain at least one uppercase letter",
};

const PasswordValidator = ({
    isPasswordValid,
    setIsPasswordValid,
    password,
    style = {},
}: Props) => {
    const [requirementState, setRequirementState] = useState<RequirementState>({
        ...initialRequirementState,
    });

    const checkPasswordValidity = () => {
        const newReqState = { ...requirementState };
        Object.keys(PWD_REGEX).forEach((key) => {
            newReqState[key] = PWD_REGEX[key].test(password);
        });
        setRequirementState(newReqState);

        const allReqsSatisfied = Object.values(newReqState).every(Boolean);
        setIsPasswordValid(allReqsSatisfied);
    };

    useEffect(() => {
        checkPasswordValidity();
    }, [password]);

    const booleanToString = (value) => {
        return `${Boolean(value)}`;
    };

    const requirementsJSX = useMemo(() => {
        return Object.entries(requirementState).map(
            ([requirementKey, satisfied]) => {
                const unicodeIcon = satisfied ? CHECKMARK_UNICODE : X_UNICODE;
                const message = REQUIREMENT_MESSAGES[requirementKey];
                return (
                    <RequirementText satisfied={booleanToString(satisfied)}>
                        {unicodeIcon} {message}
                    </RequirementText>
                );
            }
        );
    }, [requirementState]);

    return (
        <AnimatePresence>
            <PasswordPolicyContainer
                style={style}
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
            >
                {isPasswordValid ? (
                    <RequirementText satisfied="true">
                        {CHECKMARK_UNICODE} Your password is secure!
                    </RequirementText>
                ) : (
                    requirementsJSX
                )}
            </PasswordPolicyContainer>
        </AnimatePresence>
    );
};

export default PasswordValidator;
