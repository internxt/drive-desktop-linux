import { mapToTrashPayload } from './files.mapper';

describe('mapToTrashPayload', () => {
  it('should return a payload with uuid when uuid is provided', () => {
    const result = mapToTrashPayload({
      id: null,
      uuid: '36c7e2e0-a873-48ed-9eee-1bd64d53efeb',
      type: 'file',
    });

    const expectedResult = {
      uuid: '36c7e2e0-a873-48ed-9eee-1bd64d53efeb',
      type: 'file',
    };

    expect(result).toEqual(expect.objectContaining(expectedResult));
  });

  it('should return a payload with id when id is provided', () => {
    const result = mapToTrashPayload({
      id: '42',
      uuid: '',
      type: 'file',
    });

    const expectedResult = {
      id: '42',
      type: 'file',
    };

    expect(result).toEqual(expect.objectContaining(expectedResult));
  });

  it('should return an error when neither uuid nor id is provided', () => {
    const result = mapToTrashPayload({
      id: null,
      uuid: '',
      type: 'file',
    });

    expect(result).toBe(undefined);
  });
});
