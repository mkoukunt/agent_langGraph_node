import { StateGraph, START, END, interrupt,MessagesAnnotation, MemorySaver } from "@langchain/langgraph";
import { fetchData, findApi, getreasoning } from "./apiSvc";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
// 1. Define the Graph State
// This represents the "memory" that flows between nodes.
const graphState = {
  messages: {
    value: (x: any[], y: any[]) => x.concat(y),
    default: () => [],
  },
};

// 2. Define a Node
// A node is just a function that takes the current state and returns an update.
const reasoningNode = async (state: any) => {  
  // This will allow us to inspect the state at this point in the graph
   let data;
   data  = await getreasoning(state['messages'][0]['content']);  
   data=data.slice(4);
    interrupt("reasoningNode");
  return { 
    messages: [new AIMessage(data)] 
  };
};

const findApiNode = async (state: any) => {  
   let data;
   data  = await findApi(state['messages'][1]['content']);  
  return { 
    messages: [new AIMessage(data)] 
  };
};

const findDataNode = async (state: any) => {  
  
   let data;
   console.log("DATA ============",state)
   //data  = await fetchData(state['messages'][2]['content'].split(" ")[1],state['messages'][0]['apiHost'], state['messages'][0]['accessToken']);
  data  = await fetchData(state['messages'][2]['content'].split(" ")[1],"https://crexnmsdev1.solint.net/ns-api/v2", '316d192a047855cc507ff378f59711c0');
  return { 
    messages: [new SystemMessage(data)] 
  };
};


// 3. Construct the Graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("reasoning", reasoningNode) 
  .addNode("findApi", findApiNode) 
   .addNode("fetchData", findDataNode) 
  .addEdge(START, "reasoning")   
   .addEdge("reasoning", "findApi") 
    .addEdge("findApi", "fetchData")           
  .addEdge("fetchData", END);         
const checkpointer = new MemorySaver();
  export const ndpAgent = workflow.compile({checkpointer});