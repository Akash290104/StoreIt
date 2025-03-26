"use server";

import { Account, Avatars, Client, Databases, Storage } from "node-appwrite";
import { appWriteConfig } from "./config";
import { cookies } from "next/headers";
import { Database } from "lucide-react";

export const createSessionClient = async () => {
  const client = new Client()
    .setEndpoint(appWriteConfig.endpointUrl)
    .setProject(appWriteConfig.project);

  const session = (await cookies()).get("appwrite-session");

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },

    get databases() {
      return new Databases(client);
    },
  };
};

export const createAdminClient = async () => {
  const client = new Client()
    .setEndpoint(appWriteConfig.endpointUrl)
    .setProject(appWriteConfig.project)
    .setKey(appWriteConfig.secretKey);

  return {
    get account() {
      return new Account(client);
    },

    get databases() {
      return new Databases(client);
    },
    get storage() {
      return new Storage(client);
    },

    get avatars() {
      return new Avatars(client);
    },
  };
};
