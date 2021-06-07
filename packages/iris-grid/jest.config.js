module.exports = {
  transform: {
    '.(ts|tsx|js|jsx)': 'ts-jest',
  },
  roots: ['./'],
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js|jsx)$', // Everything in __tests__ or every .test|spec.ts|tsx|js
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^monaco-editor/esm/vs/editor/editor.api$':
      '<rootDir>/src/__mocks__/monaco-editor.js',
    '^monaco-editor/esm/vs/editor/(.*)':
      '<rootDir>/src/__mocks__/monaco-editor-empty.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
};
