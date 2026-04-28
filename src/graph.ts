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
  let data = { name: "name", value: "value" };
  let txt;
   let results = [];
  if (obj.arguments.subtask == "domain defaults") {
    console.log("Domain defaults validated, interrupting workflow");
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

        const params= [{name:"<P1721>",value:"1"},{name:"<P4428>",value:"1"},{name:"<P2648>",value:"1"},,{name:"<P2330>",value:"1"},,{name:"<P2367>",value:"1"}];
       const allKeys:any = [...new Set(params.flatMap(obj => obj.name))];
       const allKeysSet = new Set(params.flatMap(obj => obj.name));
       const regex = new RegExp(allKeys.join("|"), "gi");
       const matches:any = txt.matchAll(regex);
        
       for (const match of matches) {
         console.log(`Found ${match[0]} at index ${match.index}`);
         const fullLine = getFullLine(txt, match.index);
         console.log(`Full line: ${fullLine}`);
         let result = { name: match[0], line: fullLine, result: "found" };
         results.push(result);
          allKeysSet.delete(match[0]);
       }
          allKeysSet.forEach((element: any) => {
            let result = { name: element, line: "", result: "not found" };
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
