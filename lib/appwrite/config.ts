export const appWriteConfig = {
  endpointUrl: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  project: process.env.NEXT_PUBLIC_APPWRITE_PROJECT!,
  database: process.env.NEXT_PUBLIC_APPWRITE_DATABASE!,
  usersCollection: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION!,
  filesCollection: process.env.NEXT_PUBLIC_APPWRITE_FILES_COLLECTION!,
  bucket: process.env.NEXT_PUBLIC_APPWRITE_BUCKET!,
  secretKey: process.env.NEXT_APPWRITE_KEY!,
};
