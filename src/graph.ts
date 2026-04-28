import {
  StateGraph,
  START,
  END,
  interrupt,
  MessagesAnnotation,
  MemorySaver,
} from "@langchain/langgraph";
import { fetchData, findApi, getreasoning } from "./apiSvc";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import DigestClient from 'digest-fetch';
import { query } from "./db";
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
       }
   //  }
 
  return END;
}


function getFullLine(text:any, index:any) {
  // Find the start of the current line (last newline before index)
  const start = text.lastIndexOf('\n', index - 1) + 1;
  
  // Find the end of the current line (first newline after index)
  let end = text.indexOf('\n', index);
  if (end === -1) end = text.length; // End of string if no more newlines
  
  return text.substring(start, end);
}


// 2. Define a Node
// A node is just a function that takes the current state and returns an update.
const reasoningNode = async (state: any) => {
  // This will allow us to inspect the state at this point in the graph
  let data:any  = await fetch('http://rabini.org:5000/generate', {method:'POST',headers: { 'Content-Type': 'application/json' },body:JSON.stringify({question:state["messages"][0]["content"]})}); 
 // data = await getreasoning(state["messages"][0]["content"]);
  data = await data.json();
  //interrupt('{"message":"Please approve this action"}');
  return {
    messages: [{role:"ai",content:data}],
  };
};

const findToolNode = async (state: any) => {
 // let data:any;
 // data = await findApi(state["messages"][1]["content"][0]);
   let data:any  = await fetch('http://rabini.org:5001/generate', {method:'POST',headers: { 'Content-Type': 'application/json' },body:JSON.stringify({question:state["messages"][1]["content"]})}); 
    data = await data.json();
   return {
    messages: [new ToolMessage({ tool_call_id: "findToolNode", content: JSON.stringify(data) })],
  };
};

const validateNode = async (state: any) => {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  // if (lastMessage instanceof ToolMessage) {
  const obj = JSON.parse(lastMessage.content); 
  let txt;
   let results = [];
  if (obj.arguments.subtask == "brand defaults") {
    let mac="ec74d7366a4a";
    const phones_config: any[] = await query("SELECT * FROM phones_config  WHERE mac = ?", [mac]);
    const brand=phones_config[0].brand.split(" ")[0];
    const model=phones_config[0].brand.split(" ")[1];
     const server=phones_config[0].server;
    const brandOverrides: any[] = await query("SELECT * FROM defaults WHERE brand = ? AND (server='default' OR server =?)", [brand,server]);
    const brandOverridesMap = new Map<string, any>(brandOverrides.map(o => [o.default_name, o]));    
    const brandOverridesKeysSet = new Set<string>(brandOverridesMap.keys());
    const username = "52bt0r";
    const password = "f393e2687129";

    // 1. Encode credentials to Base64
    const encodedCredentials = btoa(`${username}:${password}`);

    // 2. Make the fetch request
   
    let res=fetch("https://crexnmsdev1.solint.net/cfg/cfgec74d7366a4a", {
      method: "GET",
      headers: {
        Authorization: `Basic ${encodedCredentials}`,
        "Content-Type": "application/text",
      },
    });
     txt=await (await res).text();
      console.log(txt);
      const configmap = new Map();
     const lineArray = txt.split("\n");
     lineArray.forEach(line => {
      configmap.set(line,line)
     });

      const regex = new RegExp([...brandOverridesKeysSet].map(k => `<${k}>`).join("|"), "gi");
       const matches:any = txt.matchAll(regex);

       for (const match of matches) {
         console.log(`Found ${match[0]} at index ${match.index}`);
         const fullLine = getFullLine(txt, match.index);
         console.log(`Full line: ${fullLine}`);
         let result = { name: match[0].replace(/[<>]/g, ""), line: fullLine, result: "found",server:brandOverridesMap.get( match[0].replace(/[<>]/g, "")).server };
         results.push(result);
         brandOverridesKeysSet.delete(match[0].replace(/[<>]/g, ""));
       }
       brandOverridesKeysSet.forEach((element: any) => {
         let result = { name: element, line: "", result: "not found",server:brandOverridesMap.get( element).server };
         results.push(result);
       });
    }
console.log

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

const findDataNode = async (state: any, config: any) => {
  let data;
  //console.log("DATA ============", state);
  data = await fetchData(
    state["messages"][2]["content"].split(" ")[1],
    config.configurable.apiHost,
    config.configurable.accessToken,
  );
  return {
    messages: [new SystemMessage(JSON.stringify(data))],
  };
};

// 3. Construct the Graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("reasoning", reasoningNode)
  .addNode("findTool", findToolNode)
  //.addNode("fetchData", findDataNode)
  .addNode("validate", validateNode)
  .addEdge(START, "reasoning")
  .addEdge("reasoning", "findTool")
  .addConditionalEdges("findTool", route)
  .addEdge("findTool", END)
 
const checkpointer = new MemorySaver();
export const ndpAgent = workflow.compile({ checkpointer });
