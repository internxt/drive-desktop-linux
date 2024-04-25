import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('storage_file')
export class TypeOrmStorageFile {
  @PrimaryColumn({
    nullable: false,
  })
  id!: string;

  @Column({ nullable: false })
  path!: string;

  @Column({ nullable: false, unique: true })
  size!: number;
}
