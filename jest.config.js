/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/test/jest/**/*.test.ts"],
  moduleNameMapper: {
    "^vscode$": "<rootDir>/src/__mocks__/vscode.ts",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          target: "es6",
          esModuleInterop: false,
          strict: true,
          strictNullChecks: true,
          noImplicitReturns: false,
          noImplicitAny: true,
          noImplicitThis: true,
          lib: ["esnext"],
          types: ["jest", "node"],
          rootDir: ".",
          baseUrl: ".",
          sourceMap: false,
        },
      },
    ],
  },
};