import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prismaClientSingleton = () => {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async create({ args, query }) {
          if (args.data) {
            const generateId = (dataObj: any) => {
              if (dataObj && typeof dataObj === 'object') {
                if ('id' in dataObj && !dataObj.id) {
                  dataObj.id = crypto.randomUUID();
                }
              }
            };
            if (Array.isArray(args.data)) {
              args.data.forEach(generateId);
            } else {
              generateId(args.data);
            }
          }
          return query(args);
        }
      }
    }
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;
