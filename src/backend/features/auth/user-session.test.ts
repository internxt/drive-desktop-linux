import { getUser } from './user-session';

const { configGetMock } = vi.hoisted(() => ({
  configGetMock: vi.fn(),
}));

vi.mock('../../../apps/main/config', () => ({
  default: {
    get: configGetMock,
  },
}));

describe('user-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when userData is not set', () => {
    // Given
    configGetMock.mockReturnValue(undefined);

    // When
    const result = getUser();

    // Then
    expect(result).toBe(null);
  });

  it('should return null when userData is an empty object', () => {
    // Given
    configGetMock.mockReturnValue({});

    // When
    const result = getUser();

    // Then
    expect(result).toBe(null);
  });

  it('should return the user when userData is set', () => {
    // Given
    const user = { uuid: 'user-1', email: 'test@internxt.com' };
    configGetMock.mockReturnValue(user);

    // When
    const result = getUser();

    // Then
    expect(result).toStrictEqual(user);
  });
});
