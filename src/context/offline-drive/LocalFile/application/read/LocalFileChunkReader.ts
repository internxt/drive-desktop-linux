import { Service } from 'diod';
import { Optional } from '../../../../../shared/types/Optional';
import { LocalFileId } from '../../domain/LocalFileId';
import { LocalFileRepository } from '../../domain/LocalFileRepository';

@Service()
export class LocalFileChunkReader {
  constructor(private readonly repository: LocalFileRepository) {}

  async run(
    id: string,
    length: number,
    position: number
  ): Promise<Optional<Buffer>> {
    const localFileId = new LocalFileId(id);

    const data = await this.repository.read(localFileId);

    if (position >= data.length) {
      return Optional.empty();
    }

    const chunk = data.slice(position, position + length);

    return Optional.of(chunk);
  }
}
