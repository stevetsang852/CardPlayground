module.exports = {
  ...require('../jest.config'),
  displayName: 'backend',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/../shared/src/$1'
  }
};
