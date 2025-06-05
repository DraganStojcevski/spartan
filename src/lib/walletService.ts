
import { PrismaClient } from '@prisma/client';
import { encrypt } from '../utils/crypto';

const prisma = new PrismaClient();

export async function saveWallet(userId: string, pubKey: string, privKey: string) {
  await prisma.wallet.create({
    data: {
      userId,
      publicKey: pubKey,
      privateKey: encrypt(privKey),
    },
  });
}
