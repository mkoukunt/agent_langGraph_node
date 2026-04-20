import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://rabini.org:5001',
  headers: { 'Content-Type': 'application/json' }
});

export const nsApiClient = axios.create({
  baseURL: 'https://crexnmsdev1.solint.net', 
});


export const reasoningClient = axios.create({
  baseURL: 'http://rabini.org:5000',
  headers: { 'Content-Type': 'application/json' }
});