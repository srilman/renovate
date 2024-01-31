import {parseVersion} from '.';

describe('modules/versioning/conda/index', () => {
  it.each`
    base              | other             | expected
    ${'0.4'}          | ${'0.4.0'}        | ${true}
    ${'0.4.1.rc'}     | ${'0.4.1.RC'}     | ${true}
    ${'1.1.0dev1'}    | ${'1.1.0.dev1'}   | ${false}
    ${'1.1.0dev1'}    | ${'1.1.dev1'}     | ${true}
    ${'1.1'}          | ${'1.1.0'}        | ${true}
    ${'1.1.0post2'}   | ${'1.1.post2'}    | ${true}
  `('$base.equals("$other") === $expected', ({ base, other, expected }) => {
    const res = parseVersion(base).equals(parseVersion(other));
    expect(res).toBe(expected);
  });
});
