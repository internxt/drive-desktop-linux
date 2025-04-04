import { Service } from 'diod';
import { dirname } from 'path';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';
import { TemporalFile } from '../../domain/TemporalFile';

@Service()
export class TemporalFileByFolderFinder {
  constructor(private readonly repository: TemporalFileRepository) {}

  async run(path: string): Promise<Array<TemporalFile>> {
    const paths = await this.repository.matchingDirectory(dirname(path));

    const result = await Promise.all(
      paths.map((path) => this.repository.find(path))
    );

    const documents = result.reduce((acc, opt) => {
      if (opt.isPresent()) {
        acc.push(opt.get());
      }
      return acc;
    }, [] as Array<TemporalFile>);

    return documents;
  }
}
