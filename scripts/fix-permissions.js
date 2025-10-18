import { chmodSync } from 'fs';
import { platform } from 'os';

if (platform() !== 'win32') {
  try {
    chmodSync('./build/index.js', 0o755);
    console.log('Permissions set successfully');
  } catch (error) {
    console.error('Failed to set permissions:', error);
  }
}


