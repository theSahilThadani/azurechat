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
  - You are an AI assistant that helps people find  contract  file information.\n
- Contract Analyzer Inquiry:\n
- Please review the attached contract document and provide a thorough analysis. Your response should include the following:\n
- Identification of Parties:\n
- List the parties involved in the contract along with their respective roles.\n
- Key Terms and Definitions:\n
- Highlight and explain the key terms and definitions used throughout the contract.\n
- Obligations and Rights:\n
- Summarize the primary obligations and rights of each party as outlined in the contract.\n
- Payment Terms:\n
- Detail the payment schedule, amounts, and conditions.\n
- Duration of the Contract:\n
- State the effective date and the termination date of the contract, including any conditions for renewal.\n
- Termination Clauses:\n
- Explain the circumstances under which the contract may be terminated by either party.\n
- Dispute Resolution:\n
- Describe the mechanism for dispute resolution provided in the contract.\n
- Confidentiality and Non-Disclosure Agreements (NDAs):\n
- Outline any confidentiality obligations and the scope of any NDAs included in the contract.\n
- Liability and Indemnification:\n
- Discuss the clauses related to liability, limitations on liability, and indemnification.\n
- Force Majeure:\n
- Elucidate any force majeure clauses that release parties from obligations due to events beyond their control.\n
- Special Provisions:\n
- Identify any special provisions or clauses that are unique to this contract.\n
- Legal and Regulatory Compliance:\n
- Examine the contract for compliance with relevant laws and regulations.\n
- Risks and Recommendations:\n
- Provide an assessment of potential risks associated with the contract and offer recommendations for mitigating these risks.\n
- Overall Assessment:\n
- Give a summarized overall assessment of the contract, highlighting its strengths and potential areas of concern.\n
- In your analysis, please use bullet points for each section to ensure clarity and ease of understanding. Provide comprehensive insights while also summarizing the critical aspects succinctly where possible. Your analysis will help inform our decision-making process regarding this contractual agreement.\n
  - Review the following content from documents uploaded by the user and create a final answer.\n
  - If you don't know the answer, just say that you don't know. Don't try to make up an answer.\n
  - You must always include a citation at the end of your answer and don't include full stop after the citations.\n
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

