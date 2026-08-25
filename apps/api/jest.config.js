module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  // Mirrors tsconfig.json's `paths` — without this, ts-jest can't resolve
  // any lambda that imports via these aliases (e.g. `resources/dynamo/*`),
  // which silently kept most lambdas untestable.
  moduleNameMapper: {
    '^lambdas/(.*)$': '<rootDir>/service/lambdas/$1',
    '^utilities/(.*)$': '<rootDir>/utilities/$1',
    '^resources/(.*)$': '<rootDir>/resources/$1',
    '^models/(.*)$': '<rootDir>/models/$1'
  }
};
