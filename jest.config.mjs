export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['./src/tests'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
}
