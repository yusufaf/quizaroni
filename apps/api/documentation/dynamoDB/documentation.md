# Quizaroni DynamoDB

## DynamoDB Tables
- quizaroni-{deploymentType}-main
    - Access Patterns:
        - Studysets
            - PK: `studyset#${studysetUUID}`
            - SK: `userUUID#${userUUID}`
        - Users
            - PK: `userUUID#${userUUID}`
            - SK: `userData`