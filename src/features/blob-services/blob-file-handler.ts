import { generateSasToken } from "./blob-file-recieve";

interface Props {
  blobName: string;
}

export const blobFileHandler = async (props: Props) => {
  const linkpdf = await generateSasToken(props.blobName);
  // console.log(linkpdf);
  return linkpdf;
};
