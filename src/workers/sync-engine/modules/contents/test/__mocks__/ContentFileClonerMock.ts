import {
  ContentFileCloner,
  FileCloneEvents,
} from '../../domain/contentHandlers/ContentFileCloner';
import { ContentsId } from '../../domain/ContentsId';

export class ContentFileClonerMock implements ContentFileCloner {
  mock = jest.fn();
  onMock = jest.fn();
  elapsedTimeMock = jest.fn();

  clone(): Promise<ContentsId> {
    return this.mock();
  }

  on(
    event: keyof FileCloneEvents,
    fn:
      | (() => void)
      | ((progress: number) => void)
      | ((fileId: ContentsId) => void)
      | ((error: Error) => void)
  ): void {
    return this.onMock(event, fn);
  }

  elapsedTime(): number {
    return this.elapsedTimeMock();
  }
}