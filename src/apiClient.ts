import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://rabibi.org',
  headers: { 'Content-Type': 'application/json' }
});

export const nsApiClient = axios.create({
  baseURL: 'https://crexnmsdev1.solint.net', 
});