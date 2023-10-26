/* eslint-disable max-len */
import { ContentsContainer } from './contents/ContentsContainer';
import { FilesContainer } from './files/FilesContainer';
import { FoldersContainer } from './folders/FoldersContainer';
import { ItemsContainer } from './items/ItemsContainer';
import { PlaceholderContainer } from './placeholders/PlaceholdersContainer';
import { BoundaryBridgeContainer } from './boundaryBridge/BoundaryBridgeContainer';
import { SharedContainer } from './shared/SharedContainer';

export interface DependencyContainer
  extends ItemsContainer,
    ContentsContainer,
    FilesContainer,
    FoldersContainer,
    PlaceholderContainer,
    SharedContainer,
    BoundaryBridgeContainer {}
