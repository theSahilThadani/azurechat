"use server";
import "server-only";

import { userHashedId } from "@/features/auth-page/helpers";
import { OpenAIInstance } from "@/features/common/services/openai";
import {
  ChatCompletionStreamingRunner,
  ChatCompletionStreamParams,
} from "openai/resources/beta/chat/completions";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { SimilaritySearch } from "../azure-ai-search/azure-ai-search";
import { CreateCitations, FormatCitations } from "../citation-service";
import { ChatCitationModel, ChatThreadModel } from "../models";

export const ChatApiRAG = async (props: {
  chatThread: ChatThreadModel;
  userMessage: string;
  history: ChatCompletionMessageParam[];
  signal: AbortSignal;
}): Promise<ChatCompletionStreamingRunner> => {
  const { chatThread, userMessage, history, signal } = props;

  const openAI = OpenAIInstance();

  const documentResponse = await SimilaritySearch(
    userMessage,
    10,
    // `user eq '${await userHashedId()}' and chatThreadId eq '${chatThread.id}'` filter removed
  );

  const documents: ChatCitationModel[] = [];

  if (documentResponse.status === "OK") {
    const withoutEmbedding = FormatCitations(documentResponse.response);
    const citationResponse = await CreateCitations(withoutEmbedding);

    citationResponse.forEach((c) => {
      if (c.status === "OK") {
        documents.push(c.response);
      }
    });
  }

  const content = documents
    .map((result, index) => {
      const content = result.content.document.pageContent;
      const context = `[${index}]. file name: ${result.content.document.metadata} \n file id: ${result.id} \n ${content}`;
      return context;
    })
    .join("\n------\n");
  // Augment the user prompt
  const _userMessage = `\n
- Review the following content from documents uploaded by the user and create a final answer.
- If you don't know the answer, just say that you don't know. Don't try to make up an answer.
- You must always include a citation at the end of your answer and don't include full stop after the citations.
- You're seeking assistance in crafting responses based on extracted sections of a lengthy document, incorporating page numbers and adopting a salesperson-like tone.\n
- If uncertain about an answer, clearly state so rather than inventing one.\n
- Offer specifics on switches, items, prices, and MRP from a sales perspective.\n
- When asked for a price, provide the MRP.\n
- Strive to confine answers to one page.\n
- Refrain from providing timings if asked for the office address.\n
- When referencing content, include page numbers in the format (pagenumber: X).\n
- Conclude responses with a citation format: {% citation items=[{name:"filename 1", id:"file id", page:"1"}, {name:"filename 2", id:"file id", page:"3"}] /%}\n 
- To enhance accuracy, the system will return the page number of the most relevant data from the provided PDF excerpts.\n
- Avoid citing multiple pages or omitting page numbers; include the correct page number as mentioned in the content, focusing on the first occurrence of the page number.\n
- If the data is requested in tabular form, please provide it in a complete table format similar to Excel.\n
- below is example formate to give data asked on tabular formate\n
| Student ID | Name         | Age | Grade |
|------------|--------------|-----|-------|
| 001        | John Smith   | 17  | A     |
| 002        | Emily Johnson| 16  | B     |
| 003        | Michael Brown| 18  | A     |
| 004        | Sarah Davis  | 17  | B     |
| 005        | Chris Wilson | 16  | A     |

----------------
content: 
${content}
\n
---------------- \n
question: 
${userMessage}
`;

  const stream: ChatCompletionStreamParams = {
    model: "",
    stream: true,
    messages: [
      {
        role: "system",
        content: chatThread.personaMessage,
      },
      ...history,
      {
        role: "user",
        content: _userMessage,
      },
    ],
  };

  return openAI.beta.chat.completions.stream(stream, { signal });
};
