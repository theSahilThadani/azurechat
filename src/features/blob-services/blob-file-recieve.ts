"use server";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from "@azure/storage-blob";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME??"";
// console.log(containerName);
// console.log(accountName);
// console.log(accountKey);
export const generateSasToken = async (blobName: string): Promise<string> => {
  // Create a BlobServiceClient using the storage account information
  const credentials = new StorageSharedKeyCredential(accountName??"", accountKey??"");
  const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credentials
  );

  // Get a reference to the container
  const containerClient = blobServiceClient.getContainerClient(containerName??"");

  // Get a reference to the blob
  const blobClient = containerClient.getBlobClient(blobName);

  // Set the SAS token expiry time
  const startsOn = new Date();
  const expiryDate = new Date(startsOn);
  expiryDate.setMinutes(startsOn.getMinutes() + 300); // Set the expiry time to 15 minutes from now

  // Generate the SAS token
  const blobSAS = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"), // Read permission
      startsOn,
      expiresOn: expiryDate,
    },
    credentials
  );

  const sasToken = `?${blobSAS.toString()}`;
  return blobClient.url + sasToken;
};
