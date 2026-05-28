import { query } from "./db";
import { fetchData } from "./digestClient";

async function getFullLine(text: string, index: number): Promise<string> {
  const start = text.lastIndexOf("\n", index - 1) + 1;
  let end = text.indexOf("\n", index);
  if (end === -1) end = text.length;
  return text.substring(start, end);
}

async function validate(phones_config: any[], subtask: string): Promise<{ results: any[] }> {
  const brand = phones_config[0].brand.split(" ")[0];
  const model = phones_config[0].brand.split(" ")[1];
  const server = phones_config[0].server;
  const username = phones_config[0].auth_user;
  const password = phones_config[0].auth_pass;
  const mac = phones_config[0].mac;

  let overrides: any[] = [];
  if (subtask === "brand overrides") {
    overrides = await query(
      "SELECT * FROM defaults WHERE brand = ? AND (server = 'default' OR server = ?)",
      [brand, server],
    );
  } else if (subtask === "model overrides") {
    overrides = await query(
      "SELECT * FROM device_models WHERE brand = ? AND model = ?",
      [brand, model],
    );
  }

  const overridesMap = new Map<string, any>(
    overrides.map((o) => [o.default_name, o]),
  );
  const remaining = new Set<string>(overridesMap.keys());

  const encodedCredentials = btoa(`${username}:${password}`);
  const res = await fetch(`https://crexnmsdev1.solint.net/cfg/${mac}.cfg`, {
    method: "GET",
    headers: { Authorization: `Basic ${encodedCredentials}` },
  });
  const txt = await res.text();

  const regex = new RegExp([...remaining].join("|"), "gi");
  const testResults: {
    mac: string;
    brand: string;
    model: string;
    subtask: string;
    status: string;
    results: any[];
  } = { mac: mac, brand: brand, model: model, subtask: subtask, status: "pass", results: [] };
  const results: any[] = [];

  for (const match of txt.matchAll(regex)) {
    const name = match[0];
    const fullLine = await getFullLine(txt, match.index!);
    const [override, value] = fullLine.split("=").map((s) => s.trim());
    results.push({
      name,
      expValue: overridesMap.get(name)?.default_value,
      line: value,
      result: "found",
      server: overridesMap.get(name)?.server,
    });
    remaining.delete(name);
  }
  if (remaining.size > 0) {
    testResults.status = "fail";
  }
  remaining.forEach((name) => {
    results.push({
      name,
      expValue: "n/a",
      line: "n/a",
      result: "not found",
      server: overridesMap.get(name)?.server,
    });
  });

  testResults.results = results;
  return testResults;
}

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
    subtask: string;
    status: string;
    results: any[];
  } = { mac: mac, brand: brand, model: model, subtask: subtask, status: "pass", results: [] };
  const results: any[] = [];

  const cfg1 = await fetchData("https://10.3.8.202/cfg/poly-" + mac+"-text.cfg", username, password);
  const cfg2 = await fetchData("http://10.3.10.59:8080/cfg/poly-" + mac+"-text.cfg", username, password);


  const lines1 = String(cfg1).split("\n");
  const lines2 = String(cfg2).split("\n");
  const max = Math.max(lines1.length, lines2.length);

  for (let i = 0; i < max; i++) {
    const line1 = lines1[i] ?? "";
    const line2 = lines2[i] ?? "";
    if (line1 !== line2) testResults.status = "fail";
    results.push({ line1, line2, match: line1 === line2 });
  }
  testResults.results = results;
  return testResults;
}

const polycom = { validate, configRegressionTest };

export default polycom;
