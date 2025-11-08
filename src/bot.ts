import 'dotenv/config';
import { ShiveronClient } from './core/ShiveronClient.js';

const client = new ShiveronClient();
client.start();