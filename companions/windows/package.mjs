import {packager} from '@electron/packager';
import path from 'node:path';
const output=path.resolve(process.cwd(),'../../../nav-windows');
const paths=await packager({dir:process.cwd(),name:'NAV',platform:'win32',arch:'x64',out:output,overwrite:true,asar:true,prune:true,icon:path.join(process.cwd(),'icon.ico'),ignore:[/^\/release(?:\/|$)/,/^\/test\.cjs$/,/^\/package\.mjs$/],appBundleId:'com.nav.personalassistant',appCopyright:'NAV personal assistant',win32metadata:{CompanyName:'NAV',FileDescription:'NAV Personal Assistant',ProductName:'NAV'}});
console.log(JSON.stringify({packaged:paths}));
