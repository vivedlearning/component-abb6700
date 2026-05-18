/// <reference types="node" />
/**
 * upload-asset.ts
 *
 * Reusable CLI script for uploading asset files to the VIVED Asset System.
 *
 * Usage:
 *   npm run upload-asset -- create <filePath>
 *   npm run upload-asset -- update <assetId> <filePath>
 *
 * - Owner ID is read from package.json "name" field.
 * - Asset name is derived from the filename (without extension).
 * - Authenticates interactively via Cognito (email + password prompt).
 * - Targets production API: api.vivedlearning.com
 */

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { createInterface } from "node:readline";
import { Amplify } from "aws-amplify";
import { signIn, fetchAuthSession } from "aws-amplify/auth";

// ─── Configuration ───────────────────────────────────────────────────────────

const API_BASE = "https://api.vivedlearning.com";

Amplify.configure({
  Auth: {
    Cognito: {
      identityPoolId: "us-east-1:ccd02b73-fe2b-4680-8fd1-1309f0523ff4",
      userPoolId: "us-east-1_ifGPigjqM",
      userPoolClientId: "58ohtjfbraemdcu29q0cv9sdmo",
    },
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((res) => {
    rl.question(question, (answer) => {
      rl.close();
      res(answer);
    });
  });
}

function promptHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((res) => {
    rl.question(question, (answer: string) => {
      rl.close();
      res(answer);
    });
  });
}

function generateId(): string {
  return crypto.randomUUID();
}

function getOwnerFromPackageJson(): string {
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf-8"));
  if (!pkg.name) {
    throw new Error("package.json does not have a 'name' field");
  }
  return pkg.name;
}

function deriveAssetName(filePath: string): string {
  const name = basename(filePath);
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(0, dotIndex) : name;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

async function authenticate(): Promise<string> {
  const email = await prompt("Email: ");
  const password = await promptHidden("Password: ");

  await signIn({ username: email, password });
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) {
    throw new Error("Authentication succeeded but no ID token was returned");
  }
  return token;
}

// ─── API Operations ──────────────────────────────────────────────────────────

async function uploadFile(
  fileBuffer: Buffer,
  filename: string,
  token: string,
): Promise<void> {
  // Step 1: Get signed upload URL
  const uploadUrlEndpoint = `${API_BASE}/upload/large/DataVariants/${filename}`;
  const urlResponse = await fetch(uploadUrlEndpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!urlResponse.ok) {
    throw new Error(
      `Failed to get upload URL: ${urlResponse.status} ${urlResponse.statusText}`,
    );
  }
  const signedUrl = (await urlResponse.json()) as string;

  // Step 2: PUT file to signed URL
  const putResponse = await fetch(signedUrl, {
    method: "PUT",
    body: fileBuffer,
  });
  if (!putResponse.ok) {
    throw new Error(
      `Failed to upload file: ${putResponse.status} ${putResponse.statusText}`,
    );
  }
}

async function createAsset(
  filename: string,
  ownerId: string,
  assetName: string,
  token: string,
): Promise<string> {
  const response = await fetch(`${API_BASE}/assets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ownerId,
      name: assetName,
      description: `${assetName} asset for ${ownerId}`,
      filename,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to create asset: ${response.status} ${response.statusText}`,
    );
  }
  const result = (await response.json()) as { assetId: string };
  return result.assetId;
}

async function updateAssetFile(
  assetId: string,
  filename: string,
  token: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/assets/${assetId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename }),
  });
  if (!response.ok) {
    throw new Error(
      `Failed to update asset: ${response.status} ${response.statusText}`,
    );
  }
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

function printUsage(): void {
  console.error(`
Usage:
  npm run upload-asset -- create <filePath>
  npm run upload-asset -- update <assetId> <filePath>

Commands:
  create   Upload a file as a new asset. Prints the new asset ID.
  update   Replace the file for an existing asset ID.

Examples:
  npm run upload-asset -- create public/ABB6700.glb
  npm run upload-asset -- update <asset-uuid> public/ABB6700.glb
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || !["create", "update"].includes(command)) {
    printUsage();
    process.exit(1);
  }

  let filePath: string;
  let assetId: string | undefined;

  if (command === "create") {
    filePath = args[1];
    if (!filePath) {
      console.error("Error: <filePath> is required for 'create' command.\n");
      printUsage();
      process.exit(1);
    }
  } else {
    assetId = args[1];
    filePath = args[2];
    if (!assetId || !filePath) {
      console.error(
        "Error: <assetId> and <filePath> are required for 'update' command.\n",
      );
      printUsage();
      process.exit(1);
    }
  }

  // Resolve and read the file
  const resolvedPath = resolve(filePath);
  let fileBuffer: Buffer;
  try {
    fileBuffer = readFileSync(resolvedPath);
  } catch {
    console.error(`Error: Cannot read file at '${resolvedPath}'`);
    process.exit(1);
  }

  // Derive metadata
  const ownerId = getOwnerFromPackageJson();
  const assetName = deriveAssetName(filePath);
  const extension = basename(filePath).split(".").pop() ?? "bin";
  const uniqueFilename = `${generateId()}.${extension}`;

  console.error(`Owner:    ${ownerId}`);
  console.error(`Asset:    ${assetName}`);
  console.error(`File:     ${resolvedPath}`);
  console.error(`Command:  ${command}`);
  console.error("");

  // Authenticate
  console.error("Authenticating with VIVED...");
  const token = await authenticate();
  console.error("Authenticated.\n");

  // Upload file to storage
  console.error("Uploading file...");
  await uploadFile(fileBuffer, uniqueFilename, token);
  console.error("File uploaded.\n");

  if (command === "create") {
    // Create asset metadata
    console.error("Creating asset record...");
    const newAssetId = await createAsset(
      uniqueFilename,
      ownerId,
      assetName,
      token,
    );
    console.error("Done!\n");
    // Print asset ID to stdout (for scripting/piping)
    console.log(newAssetId);
  } else {
    // Update existing asset's file reference
    console.error(`Updating asset ${assetId}...`);
    await updateAssetFile(assetId!, uniqueFilename, token);
    console.error("Done!\n");
    console.log(`Asset ${assetId} updated successfully.`);
  }
}

main().catch((err: Error) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
