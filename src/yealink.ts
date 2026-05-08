import { query } from "./db";

async function getFullLine(text: string, index: number): Promise<string> {
  const start = text.lastIndexOf("\n", index - 1) + 1;
  let end = text.indexOf("\n", index);
  if (end === -1) end = text.length;
  return text.substring(start, end);
}

async function validate( phones_config:any[],subtask:string): Promise<{ results: any[] }> {

  const brand = phones_config[0].brand.split(" ")[0];
  const model = phones_config[0].brand.split(" ")[1];
  const server = phones_config[0].server;
  const username = phones_config[0].auth_user;
  const password = phones_config[0].auth_pass;
  const mac=phones_config[0].mac;
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
    results: any[];
  } = { mac: mac, brand: brand, model: model, results: [] };
  const results: any[] = [];

  for (const match of txt.matchAll(regex)) {
    const name = match[0];
    const fullLine = await getFullLine(txt, match.index!);
    const [override, value] = fullLine.split("=").map(s => s.trim());
    results.push({
      name,
      expValue:   overridesMap.get(name)?.default_value,   
      line: value,
      result: "found",
      server: overridesMap.get(name)?.server,
    });
    remaining.delete(name);
  }

  remaining.forEach((name) => {
    results.push({
      name,
      expValue:"n/a",
      line: "n/a",
      result: "not found",
      server: overridesMap.get(name)?.server,
    });
  });

  testResults.results=results;
  return testResults;
}

const yealink = { validate };

export default yealink;
