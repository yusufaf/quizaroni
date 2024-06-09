# Quizaroni DynamoDB

## DynamoDB Tables
- quizaroni-{deploymentType}-main
    - Access Patterns:
        - Studysets
            - PK: `userUUID#${userUUID}`
            - SK: `studyset#${studysetUUID}`
        - Users
            - PK: `userUUID#${userUUID}`
            - SK: `userData`