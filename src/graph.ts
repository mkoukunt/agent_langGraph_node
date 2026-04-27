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

     if (lastMessage instanceof ToolMessage) {
       console.log("AI says:", lastMessage.content);
       if (lastMessage.name == "validate ") {
         return "validate";
       }
     }
 
  return END;
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
    messages: [{role:"tool",content:data}],
  };
};

const validateNode = async (state: any) => {
    const messages = state.messages;
   const lastMessage = messages[messages.length - 1];
  let tl=lastMessage.arguments;
 



  return {
    messages: [new AIMessage("")],
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
  .addNode("fetchData", findDataNode)
  .addNode("validate", validateNode)
  .addEdge(START, "reasoning")
  .addEdge("reasoning", "findTool")
  .addConditionalEdges("findTool", route)
  .addEdge("findTool", END)
 
const checkpointer = new MemorySaver();
export const ndpAgent = workflow.compile({ checkpointer });
