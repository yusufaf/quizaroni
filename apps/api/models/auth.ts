export type AuthorizerContext = {
    sub: string;
    userAttributes: { [key: string]: string };
    // Optional Logto Custom JWT claim; may be missing or null at runtime, so check truthiness (#180).
    username?: string;
 }