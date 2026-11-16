import { TemporalFilePath } from '../../domain/TemporalFilePath';
import { TemporalFileRepository } from '../../domain/TemporalFileRepository';

type Props = {
  repository: TemporalFileRepository;
  from: string;
  to: string;
};

export async function moveTemporalFile({ repository, from, to }: Props) {
  await repository.move(new TemporalFilePath(from), new TemporalFilePath(to));
}
