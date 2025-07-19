export type User = {
  email: string;
  userId: string;
  mnemonic: string;
  root_folder_id: number;
  /* The user's root folder UUID */
  rootFolderId: string;
  name: string;
  lastname: string;
  uuid: string;
  credit: number;
  createdAt: string;
  privateKey: string;
  publicKey: string;
  revocateKey: string;
  keys: {
    ecc: {
      publicKey: string;
      privateKey: string;
    },
    kyber: {
      publicKey: string;
      privateKey: string;
    }
  },
  bucket: string;
  registerCompleted: boolean;
  teams: boolean;
  username: string;
  bridgeUser: string;
  sharedWorkspace: boolean;
  hasReferralsProgram: boolean;
  backupsBucket: string;
  avatar: string;
  emailVerified: string;
  lastPasswordChangedAt: string;
};
