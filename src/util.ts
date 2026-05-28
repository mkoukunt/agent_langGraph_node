import { fetchData } from "./digestClient";

export async function configRegressionTest(
  phones_config: any[],
  subtask: string,
): Promise<{ results: any[] }> {
  const brand = phones_config[0].brand.split(" ")[0];
  const model = phones_config[0].brand.split(" ")[1];
  const server = phones_config[0].server;
  const username = phones_config[0].auth_user;
  const password = phones_config[0].auth_pass;
  const mac = phones_config[0].mac;

   const testResults: {
    mac: string;
    brand: string;
    model: string;
    subtask:string
    status:string
    results: any[];
  } = { mac: mac, brand: brand, model: model,subtask:subtask,status:'pass', results: [] };
  const results: any[] = [];
 const cfg1=await fetchData("https://crexnmsdev1.solint.net/cfg/"+mac,username,password);
const cfg2=await fetchData("https://10.3.8.202/cfg/"+mac,username,password);

  const lines1 = String(cfg1).split("\n");
  const lines2 = String(cfg2).split("\n");
  const max = Math.max(lines1.length, lines2.length);
  

  for (let i = 0; i < max; i++) {
    const line1 = lines1[i] ?? "";
    const line2 = lines2[i] ?? "";
    results.push({ line1, line2, match: line1 === line2 });
  }
 testResults.results=results;
  return testResults;
 
}


