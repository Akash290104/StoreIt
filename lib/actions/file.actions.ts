"use server";

import { createAdminClient, createSessionClient } from "../appwrite";
import { InputFile } from "node-appwrite/file";
import { appWriteConfig } from "../appwrite/config";
import { ID, Models, Query } from "node-appwrite";
import { convertFileToUrl, getFileType, parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./user.actions";
import { string } from "zod";

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

interface Props {
  file: File;
  ownerId: string;
  accountId: string;
  path: string;
}

export const uploadFile = async ({ file, ownerId, accountId, path }: Props) => {
  const { storage, databases } = await createAdminClient();

  try {
    const inputFile = InputFile.fromBuffer(file, file.name);
    const bucketFile = await storage.createFile(
      appWriteConfig.bucket,
      ID.unique(),
      inputFile
    );

    const fileType = getFileType(bucketFile.name).type;

    // Generate the URL for the uploaded file
    const fileUrl = `https://cloud.appwrite.io/v1/storage/buckets/${appWriteConfig.bucket}/files/${bucketFile.$id}/view?project=${appWriteConfig.project}`;

    const fileDocument = {
      type: fileType,
      enum: fileType,
      name: bucketFile.name,
      url: fileUrl,
      extension: getFileType(bucketFile.name).extension,
      size: bucketFile.sizeOriginal,
      owner: ownerId,
      accountId: accountId,
      users: [],
      bucketFileId: bucketFile.$id,
    };

    const newFile = await databases
      .createDocument(
        appWriteConfig.database,
        appWriteConfig.filesCollection,
        ID.unique(),
        { ...fileDocument, accountId }
      )
      .catch(async (error: unknown) => {
        await storage.deleteFile(appWriteConfig.bucket, bucketFile.$id);
        handleError(error, "Failed to create file document");
      });

    revalidatePath(path);
    return parseStringify(newFile);
  } catch (error) {
    handleError(error, "Failed to upload file");
  }
};

const createQueries = (
  currentUser: Models.Document,
  types: string[],
  searchText: string,
  sort: string,
  limit?: number
) => {
  const queries = [
    Query.or([
      Query.equal("owner", [currentUser.$id]),
      Query.contains("users", [currentUser.email]),
    ]),
  ];

  if (types.length > 0) {
    queries.push(Query.equal("type", types));
  }
  if (searchText) {
    queries.push(Query.contains("name", searchText));
  }
  if (limit) {
    queries.push(Query.limit(limit));
  }

  if (sort) {
    const [sortBy, orderBy] = sort.split("-");
    queries.push(
      orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy)
    );
  }

  //TO DO  : search, sort, etc.
  return queries;
};

declare type FileType = "document" | "image" | "video" | "audio" | "other";

interface GetFilesProps {
  types: FileType[];
  searchText?: string;
  sort?: string;
  limit?: number;
}

export const getFiles = async ({
  types = [],
  searchText = "",
  sort = "$createdAt-desc",
  limit,
}: GetFilesProps) => {
  const { databases } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      console.log("User not found, hence no files fetched");
      return;
    }

    const queries = createQueries(currentUser, types, searchText, sort, limit);

    const files = await databases.listDocuments(
      appWriteConfig.database,
      appWriteConfig.filesCollection,
      queries
    );

    console.log(files);

    return parseStringify(files);
  } catch (error) {
    handleError(error, "Failed to fetch files");
  }
};

interface RenameFileProps {
  fileId: string;
  name: string;
  extension: string;
  path: string;
}

export const renameFile = async ({ fileId, name, path }: RenameFileProps) => {
  const { databases } = await createAdminClient();
  try {
    const newName = `${name}`;
    const updatedFile = await databases.updateDocument(
      appWriteConfig.database,
      appWriteConfig.filesCollection,
      fileId,
      {
        name: newName,
      }
    );

    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Error renaming the file");
  }
};

interface UpdateFileUsersProps {
  fileId: string;
  emails: string[];
  path: string;
}

export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  const { databases } = await createAdminClient();
  try {
    const updatedFile = await databases.updateDocument(
      appWriteConfig.database,
      appWriteConfig.filesCollection,
      fileId,
      {
        users: emails,
      }
    );
    revalidatePath(path);
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Error adding users to the file");
  }
};

interface DeleteFileProps {
  fileId: string;
  bucketFileId: string;
  path: string;
}

export const deleteFile = async ({
  fileId,
  bucketFileId,
  path,
}: DeleteFileProps) => {
  const { databases, storage } = await createAdminClient();
  try {
    const currentUser = await getCurrentUser();

    const fileDoc = await databases.getDocument(
      appWriteConfig.database,
      appWriteConfig.filesCollection,
      fileId
    );

    
    
    if (fileDoc.owner.email !== currentUser.email) {

      const updatedUsers = fileDoc.users.filter(
        (u: string) => u !== currentUser.email
      );

      await databases.updateDocument(
        appWriteConfig.database,
        appWriteConfig.filesCollection,
        fileId,
        {
          users: updatedUsers,
        }
      );

      revalidatePath(path);
      console.log("Done");

      return parseStringify({ status: "success" });
    } else {

      const deletedFile = await databases.deleteDocument(
        appWriteConfig.database,
        appWriteConfig.filesCollection,
        fileId
      );

      if (deletedFile) {
        await storage.deleteFile(appWriteConfig.bucket, bucketFileId);
      }

      revalidatePath(path);
      return parseStringify({ status: "success" });
    }
  } catch (error) {
    handleError(error, "Error deleting users to the file");
  }
};

export async function getTotalSpaceUsed() {
  try {
    const { databases } = await createSessionClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User is not authenticated.");

    const files = await databases.listDocuments(
      appWriteConfig.database,
      appWriteConfig.filesCollection,
      [Query.equal("owner", [currentUser.$id])]
    );

    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024 /* 2GB available bucket storage */,
    };

    files.documents.forEach((file) => {
      const fileType = file.type as FileType;
      totalSpace[fileType].size += file.size;
      totalSpace.used += file.size;

      if (
        !totalSpace[fileType].latestDate ||
        new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
      ) {
        totalSpace[fileType].latestDate = file.$updatedAt;
      }
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Error calculating total space used:, ");
  }
}
