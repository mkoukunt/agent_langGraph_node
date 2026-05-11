import {
  StateGraph,
  START,
  END,
  interrupt,
  MessagesAnnotation,
  MemorySaver,
} from "@langchain/langgraph";
import { fetchData, findApi, getreasoning } from "./apiSvc";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import DigestClient from "digest-fetch";
import { query } from "./db";

import yealink from "./yealink";
import { getCollection } from "./mongo";
// 1. Define the Graph State
// This represents the "memory" that flows between nodes.
const graphState = {
  messages: {
    value: (x: any[], y: any[]) => x.concat(y),
    default: () => [],
  },
};
function route(state: any) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  // if (lastMessage instanceof ToolMessage) {
  const obj = JSON.parse(lastMessage.content);
  if (obj.name == "validate") {
    return "validate";
  } else if (obj.name == "fetch") {
    return "fetchReportNode";
  }
  //  }

  return END;
}

function getFullLine(text: any, index: any) {
  // Find the start of the current line (last newline before index)
  const start = text.lastIndexOf("\n", index - 1) + 1;

  // Find the end of the current line (first newline after index)
  let end = text.indexOf("\n", index);
  if (end === -1) end = text.length; // End of string if no more newlines

  return text.substring(start, end);
}

// 2. Define a Node
// A node is just a function that takes the current state and returns an update.
const reasoningNode = async (state: any) => {
//return {
  //      messages: [{ role: "ai", content: "fetch the failed reports for the brand yealink" }],
    //};


  // This will allow us to inspect the state at this point in the graph
  let llm: any = process.env.LLM_HOST;
  let data: any = await fetch(llm, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: state["messages"][0]["content"] }),
  });
  // data = await getreasoning(state["messages"][0]["content"]);
  data = await data.json();
  console.log("reasoningNode data ============", data[0]);
  //interrupt('{"message":"Please approve this action"}');
  return {
    messages: [{ role: "ai", content: data[0] }],
  };

  
};

const findToolNode = async (state: any) => {
  // let data:any;
  // data = await findApi(state["messages"][1]["content"][0]);
  let data: any = await fetch("http://rabini.org:5001/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: state["messages"][1]["content"] }),
  });
  data = await data.json();
  return {
    messages: [
      new ToolMessage({
        tool_call_id: "findToolNode",
        content: JSON.stringify(data),
      }),
    ],
  };
};

const validateNode = async (state: any) => {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  const obj = JSON.parse(lastMessage.content);
  const mac = obj.arguments.mac;
  const phones_config: any[] = await query(
    "SELECT * FROM phones_config  WHERE mac = ?",
    [mac],
  );
  const brand = phones_config[0].brand.split(" ")[0];
  const model = phones_config[0].brand.split(" ")[1];
  const server = phones_config[0].server;
  let txt;
  let results:{ results: any[] }={ results: []};
  if (
    obj.arguments.subtask == "brand overrides" ||
    obj.arguments.subtask == "model overrides"
  ) {
   // if (brand && brand === "yealink") {
      results = await yealink.validate(phones_config, obj.arguments.subtask);
  ///  }
  }

  const reports = await getCollection("reports");
  await reports.insertOne(results);


  return {
    messages: [
      {
        role: "tool",
        tool_call_id: "validateNode",
        content: JSON.stringify(results),
      },
    ],
  };
};

const fetchReportNode = async (state: any, config: any) => {
   const messages = state.messages;
   const lastMessage = messages[messages.length - 1];
   const obj = JSON.parse(lastMessage.content);
   const { mac, brand } = obj.arguments;

   const filter: any = {};

   if (mac) filter.mac = mac;
   if (brand) filter.brand = brand;

   const reports = await getCollection("reports");
   const docs = await reports.find(filter).sort({ createdAt: -1 }).toArray();
   return {
     messages: [new SystemMessage(JSON.stringify(docs))],
   };
};

// 3. Construct the Graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("reasoning", reasoningNode)
  .addNode("findTool", findToolNode)
  .addNode("fetchReportNode", fetchReportNode)
  .addNode("validate", validateNode)
  .addEdge(START, "reasoning")
  .addEdge("reasoning", "findTool")
  .addConditionalEdges("findTool", route)
  .addEdge("findTool", END);

const checkpointer = new MemorySaver();
export const ndpAgent = workflow.compile({ checkpointer });
