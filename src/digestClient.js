const crypto = require('node:crypto');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function md5(data) {
  return crypto.createHash('md5').update(data).digest('hex');
}
export async function sendDigestRequest(url) {
    response = await fetch(url);
  
  if (response.status === 401) {
    authHeader = response.headers.get('WWW-Authenticate');
    console.log('Received nonce, waiting 500ms...');
    
    // 3. Introduce delay before retryingawait delay(500); 

    const nonceMatch = authHeader.match(/nonce="([^"]+)"/);
    const nonce = nonceMatch ? nonceMatch[1] : null;

     const realmMatch = authHeader.match(/realm="([^"]+)"/);
    const realm = realmMatch ? realmMatch[1] : null;
    
    authString = calculateDigest("52bt0r", "f393e2687129", realm, nonce, "GET", "/cfg/cfgec74d7366a4a");
    response = await fetch(url, {
      headers: { 'Authorization': `Digest ${authString}` }
    });
  }
  
  return await response.text();
}



function calculateDigest(user, password, realm, nonce, method, uri) {
  // 1. HA1 = md5(username:realm:password)
  const ha1 = md5(`${user}:${realm}:${password}`);

  // 2. HA2 = md5(method:uri)
  const ha2 = md5(`${method}:${uri}`);

  // 3. Response = md5(ha1:nonce:ha2)
  // Note: This is the basic RFC 2069 format. 
  // RFC 2617 requires more parameters if 'qop' is provided by the server.
  const response = md5(`${ha1}:${nonce}:${ha2}`);
  
  return response;
}

sendDigestRequest("https://crexnmsdev1.solint.net/cfg/cfgec74d7366a4a")