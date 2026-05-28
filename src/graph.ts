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

import { query } from "./db";

import yealink from "./yealink";
import { getCollection } from "./mongo";
import polycom from "./polycom";
import grandstream from "./grandstream";

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
  if (obj.function?.includes("run")) {
    return "validate";
  } else if (obj.function?.includes("results")) {
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
return {
        messages: [{ role: "ai", content: state["messages"][0]["content"] }],
    };


  // This will allow us to inspect the state at this point in the graph
/*  let llm: any = process.env.LLM_HOST;
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
*/
  
};

const findToolNode = async (state: any) => {
  // let data:any;
  // data = await findApi(state["messages"][1]["content"][0]);
  let data: any = await fetch("https://rabini.org:5001/generate", {
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
  else if(obj.function=='run_config_diff_test'){
    switch (brand?.toLowerCase()) {
      case "yealink":
        results = await yealink.configRegressionTest(phones_config, 'config diff');
        break;
      case "grandstream":
         results = await grandstream.configRegressionTest(phones_config, obj.function);
        break;
      case "polycom":
         results = await polycom.configRegressionTest(phones_config, obj.function);
        break;
      default:
        results = { results: [] };
    }
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
   const { mac, brand, status, date } = obj.arguments;

   const filter: any = {};
    if(obj.function=='get_config_diff_results'){
        filter.subtask='config diff';
    }
 if(obj.function=='brand_overrides_tests'){
        filter.subtask='brand_overrides';
    }

   if (mac) filter.mac = mac;
   if (brand) filter.$expr = { $eq: [{ $toLower: "$brand" }, brand.toLowerCase()] };
   if (date && /^\d{2}-\d{2}-\d{4}$/.test(date)) filter.date = date;
   if (status && status == "passed") {
     filter.status = "pass";
   }
   if (status && status == "failed") {
     filter.status = "fail";
   }
   const reports = await getCollection("reports");
   const docs = await reports.find(filter).sort({ createdAt: -1 }).toArray();
   return {
     messages: [new SystemMessage(JSON.stringify(docs))],
   };
};

const validateConfigNode = async (state: any, config: any) => {
   const messages = state.messages;
   const lastMessage = messages[messages.length - 1];
   const obj = JSON.parse(lastMessage.content);
   const { mac, brand,subtask } = obj.arguments;

   const filter: any = {};

   if (mac) filter.mac = mac;
   if (brand) filter.brand = brand;
   if (subtask && subtask == "passed") {
     filter.status = "pass";
   }
   if (subtask && subtask == "failed") {
     filter.status = "fail";
   }
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
   .addNode("validateConfigNode", validateConfigNode)
  .addEdge(START, "reasoning")
  .addEdge("reasoning", "findTool")
  .addConditionalEdges("findTool", route)
  .addEdge("findTool", END);

const checkpointer = new MemorySaver();
export const ndpAgent = workflow.compile({ checkpointer });
