"use server";

import {
  BlobServiceClient,
  BlobUploadCommonResponse,
  ContainerClient,
} from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

const blobServiceClient =
  BlobServiceClient.fromConnectionString(connectionString??"");
const containerClient: ContainerClient =
  blobServiceClient.getContainerClient(containerName??"");

export const UploadtoBlob = async (formData: FormData) => {
  // console.log(formData);
  try {
    const fileField = formData.get("file") as File;
    const idField = formData.get("id") as string;

    if (!fileField || !idField) {
      throw new Error("Missing required fields");
    }

    const fileName = fileField.name;
    const blockBlobClient = containerClient.getBlockBlobClient(`${fileName}`);
    // console.log(blockBlobClient);

    // Read the file content into a buffer or an ArrayBuffer
    const fileContent = await fileField.arrayBuffer();

    // Use uploadData with the file content
    const uploadResponse: BlobUploadCommonResponse =
      await blockBlobClient.uploadData(fileContent, {
        blobHTTPHeaders: { blobContentType: "application/pdf" },
      });

    // console.log("File uploaded successfully:", uploadResponse);
  } catch (error) {
    console.error("Error uploading file to Azure Blob Storage:", error);
  }
};
