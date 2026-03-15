import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./path-alias-loader.mjs', pathToFileURL('./scripts/'));
