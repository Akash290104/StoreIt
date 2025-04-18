"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { appWriteConfig } from "../appwrite/config";
import { log } from "console";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";
import { parse } from "path";
import { redirect } from "next/navigation";

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();
  try {
    const result = await databases.listDocuments(
      appWriteConfig.database,
      appWriteConfig.usersCollection,
      [Query.equal("email", [email])]
    );

    return result.total > 0 ? result.documents[0] : null;
  } catch (error) {
    handleError(error, "Error fetching email");
  }
};

export const sendEmailOTP = async (email: string) => {
  const { account } = await createAdminClient();

  try {
    const session = await account.createEmailToken(ID.unique(), email);

    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send Email OTP");
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);
  const accountId = await sendEmailOTP(email);

  if (!accountId) {
    throw new Error("Failed to send an OTP");
  }

  if (existingUser) {
    console.log("User already exists");
    return;
  }

  if (!existingUser) {
    const { databases } = await createAdminClient();
    await databases.createDocument(
      appWriteConfig.database,
      appWriteConfig.usersCollection,
      ID.unique(),
      {
        fullName,
        email,
        avatar:
          "https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg",
        accountId,
      }
    );
  }

  return parseStringify({ accountId });
};

export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createSession(accountId, password);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    handleError(error, "Failed to verify OTP");
  }
};

export const getCurrentUser = async () => {
  try {
    const { databases, account } = await createSessionClient();
    const result = await account.get();

    const user = await databases.listDocuments(
      appWriteConfig.database,
      appWriteConfig.usersCollection,
      [Query.equal("accountId", result.$id)]
    );

    return user.total <= 0 ? null : parseStringify(user.documents[0]);
  } catch (error) {
    console.log("Session not found. Redirecting to sign-in.", error);
    return null; // Prevents layout from crashing
  }
};

export const signOutUser = async () => {
  const { account } = await createSessionClient();

  try {
    await account.deleteSession("current");
    (await cookies()).delete("appwrite-session");
    console.log("User logged out");
  } catch (error) {
    handleError(error, "Failed to sign out user");
  } finally {
    redirect("/sign-in");
  }
};

export const signInUser = async ({ email }: { email: string }) => {
  const { account } = await createAdminClient();

  try {
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      await sendEmailOTP(email);
      console.log("User logged in");
      return parseStringify({ accountId: existingUser.accountId });
    }

    console.log("User not found, hence not logged in");
    return parseStringify({ accountId: null, error: "User not found" });
  } catch (error) {
    handleError(error, "Failed to sign in user");
  }
};
