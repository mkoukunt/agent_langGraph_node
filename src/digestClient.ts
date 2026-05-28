import DigestClient from 'digest-fetch';

// 2. Use it just like a normal fetch call
export async function fetchData(url:string,user:string,password:string) {
    const client = new DigestClient(user, password);
  
  try {
    const response = await client.fetch(url, {
      method: 'GET',
    });
    
    return await response.text();    
  } catch (error) {
    console.error('Fetch error:', error);
  }
}
