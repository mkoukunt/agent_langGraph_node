import axios from 'axios';
import { apiClient } from './apiClient';

export const getreasoning = async (qn:string): Promise<string> => {
  console.log('qn is', qn);
  const { data } = await apiClient.post<string>('/generate',{question:{qn}}); // Adjust the endpoint as needed
  console.log('data is', data);
  return {data}.data; // Adjust based on your API response structure
};

export const findApi = async (qn:string): Promise<string> => {  
  const { data } = await apiClient.post<string>('/generate',{question:{qn}}); // Adjust the endpoint as needed  
  return {data}.data; // Adjust based on your API response structure
};

export const fetchData = async (path:string, apiHost:string, accessToken:string): Promise<string> => {
  const nsApiClient = axios.create({
    baseURL: apiHost, 
  });
  const { data } = await nsApiClient.get<string>(apiHost+path,{
  headers: {
    'Authorization': `Bearer ${accessToken}`    
  }
}); 
  console.log(data)
  return {data}.data; // Adjust based on your API response structure
};